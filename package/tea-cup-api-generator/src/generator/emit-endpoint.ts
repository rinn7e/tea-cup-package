/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import {
  type Emitter,
  banner,
  codecOf,
  runtimeModule,
  typeOf,
} from './emit-schema'
import {
  type Import,
  importLines,
  importName,
  typeRefImports,
  usedImports,
} from './imports'
import type { Ty } from './ir'
import {
  capitalize,
  checkUnique,
  docComment,
  isIdentifier,
  operationBaseName,
  operationFunctionName,
  propertyAccess,
  propertyKey,
  quote,
} from './naming'
import { type Ctx, resolve, schemaTy, specError } from './normalize'
import {
  type Content,
  type Method,
  type OperationObject,
  type ParameterObject,
  type RequestBodyObject,
  type ResponseObject,
  methods,
} from './openapi'

export type Skipped = { label: string; reason: string }

type Endpoint = {
  // The operation name before renaming, which `rename.operations` is keyed by
  base: string
  name: string
  method: Method
  path: string
  code: string
}

type Param = {
  name: string
  required: boolean
  ty: Ty
  // How a query parameter is written, when it is not the default `form`
  style: string | undefined
}

// Content
// -----------------------------------------------------------------

const isJson = (type: string): boolean => {
  const base = type.split(';')[0].trim().toLowerCase()
  return base === 'application/json' || base.endsWith('+json') || base === '*/*'
}

const findType = (
  content: Content,
  test: (type: string) => boolean,
): string | undefined => Object.keys(content).find(test)

type BodyKind =
  | { _tag: 'Json'; ty: Ty }
  | { _tag: 'Multipart'; ty: Ty }
  | { _tag: 'UrlEncoded'; ty: Ty }
  | { _tag: 'Text' }
  | { _tag: 'Blob'; contentType: string }

// Note [The body of a request]
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// When a request body lists several media types, the generator takes the
// first it can type, in this order: JSON (`application/json`, `*+json`),
// `multipart/form-data`, `application/x-www-form-urlencoded`, `text/plain`,
// and else the first one listed, sent as a `Blob` of that type.

const bodyKind = (ctx: Ctx, content: Content, where: string): BodyKind => {
  const schemaOf = (type: string): Ty =>
    schemaTy(ctx, content[type]?.schema ?? {}, `${where}.content.${type}`)
  const json = findType(content, isJson)
  const multipart = findType(content, (type) =>
    type.startsWith('multipart/form-data'),
  )
  const urlEncoded = findType(content, (type) =>
    type.startsWith('application/x-www-form-urlencoded'),
  )
  const text = findType(content, (type) => type.startsWith('text/plain'))
  const first = Object.keys(content)[0]
  if (json !== undefined) {
    return { _tag: 'Json', ty: schemaOf(json) }
  } else if (multipart !== undefined) {
    return { _tag: 'Multipart', ty: schemaOf(multipart) }
  } else if (urlEncoded !== undefined) {
    return { _tag: 'UrlEncoded', ty: schemaOf(urlEncoded) }
  } else if (text !== undefined) {
    return { _tag: 'Text' }
  } else if (first !== undefined) {
    return { _tag: 'Blob', contentType: first }
  } else {
    throw specError(where, 'a request body without content')
  }
}

type AnswerKind =
  | { _tag: 'None' }
  | { _tag: 'Json'; ty: Ty }
  | { _tag: 'Text' }
  | { _tag: 'Blob' }

// Note [An empty answer]
// ~~~~~~~~~~~~~~~~~~~~~~
// An answer with no content is `null`. So is a JSON answer whose schema is an
// array that must be empty (`maxItems: 0`): it carries nothing (Servant writes
// the unit `()` that way), and an `unknown[]` would only be ignored by every
// caller.

const answerKind = (
  ctx: Ctx,
  response: ResponseObject,
  where: string,
): AnswerKind => {
  const content = response.content ?? {}
  const json = findType(content, isJson)
  const text = findType(content, (type) => type.startsWith('text/'))
  if (Object.keys(content).length === 0) {
    return { _tag: 'None' }
  } else if (json !== undefined) {
    const ty = schemaTy(
      ctx,
      content[json]?.schema ?? {},
      `${where}.content.${json}`,
    )
    // See Note [An empty answer]
    return ty._tag === 'Array' && ty.items._tag === 'Never'
      ? { _tag: 'None' }
      : { _tag: 'Json', ty }
  } else if (text !== undefined) {
    return { _tag: 'Text' }
  } else {
    return { _tag: 'Blob' }
  }
}

const isSuccess = (code: string): boolean => /^2(\d\d|XX)$/i.test(code)

// Parameters
// -----------------------------------------------------------------

const queryStyle = (p: ParameterObject, where: string): string | undefined => {
  const style = p.style ?? 'form'
  const explode = p.explode ?? style === 'form'
  if (style === 'form') {
    return explode ? undefined : 'formNoExplode'
  } else if (
    style === 'spaceDelimited' ||
    style === 'pipeDelimited' ||
    style === 'deepObject'
  ) {
    return style
  } else {
    throw specError(where, `a query parameter in the style ${style}`)
  }
}

// A path or header parameter is written as text, so it must be a scalar or a
// list of scalars
const isScalar = (ty: Ty): boolean => {
  switch (ty._tag) {
    case 'String':
    case 'Number':
    case 'Boolean':
    case 'Literals':
    case 'Ref':
    case 'External':
      return true
    case 'Array':
      return isScalar(ty.items) && ty.items._tag !== 'Array'
    case 'Union':
      return ty.members.every(isScalar)
    default:
      return false
  }
}

// The parameters of the path item, replaced by those of the operation with
// the same name and place
const parametersOf = (
  inherited: ParameterObject[],
  own: ParameterObject[],
): ParameterObject[] => [
  ...inherited.filter(
    (p) => !own.some((o) => o.name === p.name && o.in === p.in),
  ),
  ...own,
]

const param = (ctx: Ctx, p: ParameterObject, where: string): Param => {
  if (p.schema === undefined) {
    throw specError(
      where,
      `parameter ${p.name} has no schema (a content parameter)`,
    )
  } else {
    const ty = schemaTy(ctx, p.schema, `${where}.schema`)
    return {
      name: p.name,
      required: p.in === 'path' || p.required === true,
      ty,
      style: p.in === 'query' ? queryStyle(p, where) : undefined,
    }
  }
}

// An endpoint
// -----------------------------------------------------------------

// A template literal of the path, each `{name}` filled with its parameter
const pathTemplate = (
  path: string,
  pathParams: Param[],
  where: string,
): string => {
  const declared = pathParams.map((p) => p.name)
  const names = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
  const missing = names.filter((name) => !declared.includes(name))
  if (missing.length > 0) {
    throw specError(
      where,
      `path parameter ${missing.join(', ')} is not declared`,
    )
  } else if (names.length === 0) {
    return quote(path)
  } else {
    const escaped = path.replace(/[\\`]|\$\{/g, (c) => `\\${c}`)
    return `\`${escaped.replace(
      /\{([^}]+)\}/g,
      (_m, name: string) =>
        `\${pathParam(${propertyAccess('params.path', name)})}`,
    )}\``
  }
}

const groupType = (em: Emitter, params: Param[]): string =>
  `{ ${params
    .map(
      (p) =>
        `${propertyKey(p.name)}${p.required ? '' : '?'}: ${typeOf(em, p.ty)}`,
    )
    .join('; ')} }`

const endpoint = (
  ctx: Ctx,
  em: Emitter,
  method: Method,
  path: string,
  op: OperationObject,
  inherited: ParameterObject[],
): Endpoint => {
  const where = `paths.${path}.${method}`
  const base = operationBaseName(ctx.options, method, path, op)
  const name = operationFunctionName(ctx.options, base)
  const params = parametersOf(
    inherited,
    (op.parameters ?? []).map((p, i) =>
      resolve<ParameterObject>(
        ctx,
        'parameters',
        p,
        `${where}.parameters[${i}]`,
      ),
    ),
  )
  const cookies = params.filter((p) => p.in === 'cookie')
  if (cookies.some((p) => p.required === true)) {
    throw specError(
      where,
      'a required cookie parameter, which a browser request cannot set',
    )
  }
  const inGroup = (place: ParameterObject['in']): Param[] =>
    params
      .filter((p) => p.in === place)
      .map((p, i) => param(ctx, p, `${where}.${place}[${i}]`))
  const pathParams = inGroup('path')
  const queryParams = inGroup('query')
  const headerParams = inGroup('header')
  const unscalar = [...pathParams, ...headerParams].filter(
    (p) => !isScalar(p.ty),
  )
  if (unscalar.length > 0) {
    throw specError(
      where,
      `the path or header parameter ${unscalar.map((p) => p.name).join(', ')} is not a scalar`,
    )
  }

  const requestBody =
    op.requestBody === undefined
      ? undefined
      : resolve<RequestBodyObject>(
          ctx,
          'requestBodies',
          op.requestBody,
          `${where}.requestBody`,
        )
  const body =
    requestBody === undefined
      ? undefined
      : {
          required: requestBody.required === true,
          kind: bodyKind(
            ctx,
            requestBody.content ?? {},
            `${where}.requestBody`,
          ),
        }

  const responses = Object.entries(op.responses ?? {}).map(
    ([code, r]): [string, ResponseObject] => [
      code,
      resolve<ResponseObject>(
        ctx,
        'responses',
        r,
        `${where}.responses.${code}`,
      ),
    ],
  )
  const success = responses
    .filter(([code]) => isSuccess(code))
    .sort(([a], [b]) => a.localeCompare(b))[0]
  if (success === undefined) {
    throw specError(where, 'no 2xx response')
  }
  const answer = answerKind(ctx, success[1], `${where}.responses.${success[0]}`)
  const errorTys = responses
    .filter(([code]) => !isSuccess(code))
    .flatMap(([code, r]) => {
      const kind = answerKind(ctx, r, `${where}.responses.${code}`)
      return kind._tag === 'Json' ? [kind.ty] : []
    })
  // The same schema for several codes is one member
  const errors = errorTys.filter(
    (ty, i) =>
      errorTys.findIndex((other) => codecOf(em, other) === codecOf(em, ty)) ===
      i,
  )
  const errorBody = ctx.options.errorBody
  const errorCodec =
    errors.length > 0
      ? errors.length === 1
        ? codecOf(em, errors[0])
        : `t.union([${errors.map((ty) => codecOf(em, ty)).join(', ')}])`
      : errorBody === null
        ? 't.unknown'
        : errorBody.codec
  const errorType =
    errors.length > 0
      ? errors.map((ty) => typeOf(em, ty)).join(' | ')
      : errorBody === null
        ? 'unknown'
        : errorBody.type

  const answerType =
    answer._tag === 'None'
      ? 'null'
      : answer._tag === 'Json'
        ? typeOf(em, answer.ty)
        : answer._tag === 'Text'
          ? 'string'
          : 'Blob'
  const answerCode =
    answer._tag === 'None'
      ? 'noAnswer'
      : answer._tag === 'Json'
        ? `jsonAnswer(${codecOf(em, answer.ty)})`
        : answer._tag === 'Text'
          ? 'textAnswer'
          : 'blobAnswer'

  const bodyType =
    body === undefined
      ? []
      : [
          `body${body.required ? '' : '?'}: ${
            body.kind._tag === 'Text'
              ? 'string'
              : body.kind._tag === 'Blob'
                ? 'Blob'
                : typeOf(em, body.kind.ty)
          }`,
        ]
  const bodyValue = (() => {
    if (body === undefined) {
      return "{ _tag: 'None' }"
    } else {
      const value =
        body.kind._tag === 'Blob'
          ? `{ _tag: 'Blob', value: params.body, contentType: ${quote(body.kind.contentType)} }`
          : `{ _tag: '${body.kind._tag}', value: params.body }`
      return body.required
        ? value
        : `params.body === undefined ? { _tag: 'None' } : ${value}`
    }
  })()

  const fields = [
    ...(pathParams.length > 0 ? [`path: ${groupType(em, pathParams)}`] : []),
    ...(queryParams.length > 0
      ? [
          `query${queryParams.some((p) => p.required) ? '' : '?'}: ${groupType(em, queryParams)}`,
        ]
      : []),
    ...(headerParams.length > 0
      ? [
          `header${headerParams.some((p) => p.required) ? '' : '?'}: ${groupType(em, headerParams)}`,
        ]
      : []),
    ...bodyType,
  ]
  const allOptional = fields.every((f) => /^\w+\?:/.test(f))
  const paramsType = `${capitalize(name)}Params`
  const styles = queryParams.flatMap((p) =>
    p.style === undefined ? [] : [`${propertyKey(p.name)}: ${quote(p.style)}`],
  )
  const query =
    queryParams.length === 0
      ? "''"
      : styles.length === 0
        ? 'queryString(params.query)'
        : `queryString(params.query, { ${styles.join(', ')} })`

  const label = `${method.toUpperCase()} ${path}`
  const code = [
    `// ${label}${name === base ? '' : ` (${base})`}`,
    `export type ${paramsType} = {`,
    ...fields.map((f) => `  ${f}`),
    '  signal?: AbortSignal',
    '  cache?: RequestCache',
    '}',
    '',
    ...docComment([op.summary, op.description], op.deprecated === true),
    `export const ${name} = (params: ${paramsType}${allOptional ? ' = {}' : ''}): TE.TaskEither<HttpError<${errorType}>, ${answerType}> =>`,
    `  send(${ctx.options.client?.name ?? 'client'}, {`,
    `    method: '${method.toUpperCase()}',`,
    `    path: ${pathTemplate(path, pathParams, where)},`,
    `    query: ${query},`,
    `    headers: ${headerParams.length > 0 ? 'params.header' : 'undefined'},`,
    `    body: ${bodyValue},`,
    '    signal: params.signal,',
    '    cache: params.cache,',
    `  }, ${answerCode}, ${errorCodec})`,
  ].join('\n')
  return { base, name, method, path, code }
}

// The endpoints file
// -----------------------------------------------------------------

const endpointFileImports = (ctx: Ctx, em: Emitter): Import[] => {
  const client = ctx.options.client
  return [
    {
      _tag: 'Namespace',
      alias: 'TE',
      module: 'fp-ts/TaskEither',
      typeOnly: true,
    },
    { _tag: 'Namespace', alias: 't', module: 'io-ts', typeOnly: false },
    {
      _tag: 'Named',
      name: 'HttpError',
      module: '@rinn7e/tea-cup-prelude/type/http-error',
      typeOnly: true,
    },
    ...[
      'BlobJson',
      'blobAnswer',
      'jsonAnswer',
      'noAnswer',
      'pathParam',
      'queryString',
      'send',
      'textAnswer',
    ].map(
      (name): Import => ({
        _tag: 'Named',
        name,
        module: runtimeModule,
        typeOnly: false,
      }),
    ),
    ...(client === null
      ? []
      : [
          {
            _tag: 'Named' as const,
            name: client.name,
            module: client.module,
            typeOnly: false,
          },
        ]),
    {
      _tag: 'Namespace',
      alias: em.prefix.replace(/\.$/, ''),
      module: ctx.options.schemasModule,
      typeOnly: false,
    },
    ...typeRefImports([
      ...Object.values(ctx.options.schemaTypes),
      ...Object.values(ctx.options.formatTypes),
      ...(ctx.options.errorBody === null ? [] : [ctx.options.errorBody]),
    ]),
  ]
}

export const endpointsFile = (
  ctx: Ctx,
  em: Emitter,
): { code: string; skipped: Skipped[]; bases: string[] } => {
  const paths = ctx.doc.paths ?? {}
  const results = Object.keys(paths)
    .sort()
    .flatMap((path) => {
      const item = paths[path]
      const present = methods.filter((m) => item[m] !== undefined)
      if (item.$ref !== undefined) {
        return [
          { _tag: 'Skipped' as const, label: path, reason: 'a path item $ref' },
        ]
      } else {
        return present.map((method) => {
          const label = `${method.toUpperCase()} ${path}`
          try {
            const inherited = (item.parameters ?? []).map((p, i) =>
              resolve<ParameterObject>(
                ctx,
                'parameters',
                p,
                `paths.${path}.parameters[${i}]`,
              ),
            )
            return {
              _tag: 'Generated' as const,
              endpoint: endpoint(
                ctx,
                em,
                method,
                path,
                item[method] as OperationObject,
                inherited,
              ),
            }
          } catch (err) {
            return {
              _tag: 'Skipped' as const,
              label,
              reason: err instanceof Error ? err.message : String(err),
            }
          }
        })
      }
    })
  const generated = results.flatMap((r) =>
    r._tag === 'Generated' ? [r.endpoint] : [],
  )
  const skipped = results.flatMap((r) =>
    r._tag === 'Skipped' ? [{ label: r.label, reason: r.reason }] : [],
  )
  const imports = endpointFileImports(ctx, em)
  const code = (body: string): string =>
    [
      ...banner(ctx.options.specName),
      ...(skipped.length === 0
        ? []
        : [
            '//',
            '// Not generated:',
            ...skipped.map((s) => `// - ${s.label}: ${s.reason}`),
          ]),
      '',
      ...importLines(body, imports),
      '',
      body,
      '',
    ].join('\n')
  const body = [
    generated.map((e) => e.code).join('\n\n'),
    '',
    '// The method and path of each function, for contract tests',
    'export const operations = {',
    ...generated.map(
      (e) =>
        `  ${isIdentifier(e.name) ? e.name : quote(e.name)}: { method: ${quote(e.method.toUpperCase())}, path: ${quote(e.path)} },`,
    ),
    '} as const',
  ].join('\n')
  checkUnique(
    'operations',
    generated.flatMap((e): [string, string][] => [
      [e.base, e.name],
      [`${e.base} (params)`, `${capitalize(e.name)}Params`],
    ]),
    [...usedImports(body, imports).map(importName), 'operations'],
  )
  return { code: code(body), skipped, bases: generated.map((e) => e.base) }
}
