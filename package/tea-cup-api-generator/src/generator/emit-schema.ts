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
  type Import,
  importLines,
  importName,
  typeRefImports,
  usedImports,
} from './imports'
import type { Field, Literal, Ty } from './ir'
import { checkUnique, docComment, propertyKey, quote } from './naming'
import type { ResolvedOptions } from './options'
import type { Group } from './order'

export const runtimeModule = '@rinn7e/tea-cup-api-generator'

// A schema to write: one of `components.schemas`, or the union of the
// messages of an AsyncAPI channel
export type SchemaEntry = {
  ty: Ty
  description: string | undefined
  deprecated: boolean
}

export type Emitter = {
  options: ResolvedOptions
  typeName: (raw: string) => string
  // Put before the name of a generated schema: `''` in the schemas file,
  // `Schema.` in the endpoints file, which imports it under that name
  prefix: string
}

// Codecs
// -----------------------------------------------------------------

const literalCode = (value: Literal): string =>
  typeof value === 'string' ? quote(value) : String(value)

const union = (codecs: string[]): string => {
  if (codecs.length === 0) {
    return 't.never'
  } else if (codecs.length === 1) {
    return codecs[0]
  } else {
    return `t.union([${codecs.join(', ')}])`
  }
}

// io-ts types `t.intersection` for two to five members, so a longer one nests
const intersection = (codecs: string[]): string => {
  if (codecs.length === 0) {
    return 't.unknown'
  } else if (codecs.length === 1) {
    return codecs[0]
  } else if (codecs.length <= 5) {
    return `t.intersection([${codecs.join(', ')}])`
  } else {
    return `t.intersection([${codecs.slice(0, 4).join(', ')}, ${intersection(codecs.slice(4))}])`
  }
}

export const codecOf = (em: Emitter, ty: Ty): string => {
  switch (ty._tag) {
    case 'Ref': {
      const ref = em.options.schemaTypes[ty.schema]
      return ref === undefined
        ? `${em.prefix}${em.typeName(ty.schema)}Json`
        : ref.codec
    }
    case 'External':
      return ty.ref.codec
    case 'String':
      return 't.string'
    case 'Number':
      return 't.number'
    case 'Boolean':
      return 't.boolean'
    case 'Null':
      return 't.null'
    case 'Unknown':
      return 't.unknown'
    case 'Never':
      return 't.never'
    case 'Blob':
      return 'BlobJson'
    case 'Literals': {
      const strings = ty.values.filter(
        (v): v is string => typeof v === 'string',
      )
      const others = ty.values.filter((v) => typeof v !== 'string')
      const stringCodec =
        strings.length === 0
          ? []
          : strings.length === 1
            ? [`t.literal(${quote(strings[0])})`]
            : [
                `t.keyof({ ${strings.map((v) => `${propertyKey(v)}: null`).join(', ')} })`,
              ]
      const otherCodecs = others.map((v) =>
        v === null ? 't.null' : `t.literal(${literalCode(v)})`,
      )
      return union([...stringCodec, ...otherCodecs])
    }
    case 'Array':
      return `t.array(${codecOf(em, ty.items)})`
    case 'Tuple':
      return `t.tuple([${ty.items.map((item) => codecOf(em, item)).join(', ')}])`
    case 'Object': {
      const field = (f: Field): string =>
        [
          ...docComment([f.description], false),
          `${propertyKey(f.key)}: ${codecOf(em, f.ty)},`,
        ].join('\n')
      const required = ty.fields.filter((f) => f.required)
      const optional = ty.fields.filter((f) => !f.required)
      const group = (fn: string, fields: Field[]): string =>
        `${fn}({\n${fields.map(field).join('\n')}\n})`
      if (optional.length === 0) {
        return group('t.type', required)
      } else if (required.length === 0) {
        return group('t.partial', optional)
      } else {
        return `t.intersection([${group('t.type', required)}, ${group('t.partial', optional)}])`
      }
    }
    case 'Record':
      return ty.values._tag === 'Unknown'
        ? 't.UnknownRecord'
        : `t.record(t.string, ${codecOf(em, ty.values)})`
    case 'Union':
      return union(ty.members.map((m) => codecOf(em, m)))
    case 'Intersection':
      return intersection(ty.members.map((m) => codecOf(em, m)))
  }
}

// Types
// -----------------------------------------------------------------

const parenthesized = (parts: string[], separator: string, empty: string) => {
  if (parts.length === 0) {
    return empty
  } else if (parts.length === 1) {
    return parts[0]
  } else {
    return `(${parts.join(separator)})`
  }
}

export const typeOf = (em: Emitter, ty: Ty): string => {
  switch (ty._tag) {
    case 'Ref': {
      const ref = em.options.schemaTypes[ty.schema]
      return ref === undefined
        ? `${em.prefix}${em.typeName(ty.schema)}`
        : ref.type
    }
    case 'External':
      return ty.ref.type
    case 'String':
      return 'string'
    case 'Number':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'Null':
      return 'null'
    case 'Unknown':
      return 'unknown'
    case 'Never':
      return 'never'
    case 'Blob':
      return 'Blob'
    case 'Literals':
      return parenthesized(ty.values.map(literalCode), ' | ', 'never')
    case 'Array':
      return `Array<${typeOf(em, ty.items)}>`
    case 'Tuple':
      return `[${ty.items.map((item) => typeOf(em, item)).join(', ')}]`
    case 'Object':
      return `{ ${ty.fields
        .map(
          (f) =>
            `${propertyKey(f.key)}${f.required ? '' : '?'}: ${typeOf(em, f.ty)}`,
        )
        .join('; ')} }`
    case 'Record':
      return `Record<string, ${typeOf(em, ty.values)}>`
    case 'Union':
      return parenthesized(
        ty.members.map((m) => typeOf(em, m)),
        ' | ',
        'never',
      )
    case 'Intersection':
      return parenthesized(
        ty.members.map((m) => typeOf(em, m)),
        ' & ',
        'unknown',
      )
  }
}

// Eq
// -----------------------------------------------------------------

// See Note [Generated Eq] in `src/runtime/eq.ts`

const isSimple = (ty: Ty): boolean =>
  ty._tag === 'String' ||
  ty._tag === 'Number' ||
  ty._tag === 'Boolean' ||
  ty._tag === 'Literals'

export const eqOf = (em: Emitter, ty: Ty): string => {
  switch (ty._tag) {
    case 'Ref': {
      const ref = em.options.schemaTypes[ty.schema]
      return ref === undefined
        ? `${em.prefix}${em.typeName(ty.schema)}Eq`
        : ref.eq
    }
    case 'External':
      return ty.ref.eq
    case 'String':
      return 'S.Eq'
    case 'Number':
      return 'N.Eq'
    case 'Boolean':
      return 'B.Eq'
    case 'Null':
      return 'nullEq'
    case 'Unknown':
      return 'unknownEq'
    case 'Never':
    case 'Blob':
    case 'Literals':
      return 'EqClass.eqStrict'
    case 'Array':
      return `A.getEq(${eqOf(em, ty.items)})`
    case 'Tuple':
      return `EqClass.tuple(${ty.items.map((item) => eqOf(em, item)).join(', ')})`
    case 'Object':
      return `structEq({ ${ty.fields
        .map((f) => `${propertyKey(f.key)}: ${eqOf(em, f.ty)}`)
        .join(', ')} })`
    case 'Record':
      return ty.values._tag === 'Unknown'
        ? 'unknownEq'
        : `R.getEq(${eqOf(em, ty.values)})`
    case 'Union': {
      const values = ty.members.filter((m) => m._tag !== 'Null')
      const hasNull = values.length < ty.members.length
      const inner = unionValueEq(em, values, ty.discriminator)
      if (values.length === 0) {
        return 'nullEq'
      } else if (hasNull) {
        return `NullableEq(${inner})`
      } else {
        return inner
      }
    }
    case 'Intersection':
      return `intersectionEq([${ty.members.map((m) => eqOf(em, m)).join(', ')}])`
  }
}

const unionValueEq = (
  em: Emitter,
  values: Ty[],
  discriminator: Extract<Ty, { _tag: 'Union' }>['discriminator'],
): string => {
  if (discriminator !== null) {
    return `discriminatedEq(${quote(discriminator.property)}, { ${discriminator.mapping
      .map(({ value, ty }) => `${propertyKey(value)}: ${eqOf(em, ty)}`)
      .join(', ')} })`
  } else if (values.length === 1) {
    return eqOf(em, values[0])
  } else if (values.every(isSimple)) {
    return 'EqClass.eqStrict'
  } else {
    return `unionEq([${values
      .map((m) => `[${codecOf(em, m)}, ${eqOf(em, m)}]`)
      .join(', ')}])`
  }
}

// The schemas file
// -----------------------------------------------------------------

// Note [A named plain schema is a branded type]
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// A spec names the schema of an id (or another value it wants told apart)
// and refers to it wherever one is held, so a named schema of a bare string
// or number becomes a branded type, which only its codec makes: a `PetId`
// cannot be passed where an `OwnerId` or a count is expected. The same value
// written inline stays a plain `string` or `number`. `brandNamedPrimitives:
// false` turns this off.

const schemaBlock = (
  em: Emitter,
  raw: string,
  entry: SchemaEntry,
  recursive: boolean,
): string[] => {
  const name = em.typeName(raw)
  const ty = entry.ty
  const doc = docComment([entry.description], entry.deprecated)
  if (
    em.options.brandNamedPrimitives &&
    (ty._tag === 'String' || ty._tag === 'Number')
  ) {
    // See Note [A named plain schema is a branded type]
    const isString = ty._tag === 'String'
    return [
      ...doc,
      `export type ${name} = ${isString ? 'string' : 'number'} & { readonly __brand: unique symbol }`,
      '',
      `export const ${name}Json = ${isString ? 'brandedString' : 'brandedNumber'}<${name}>(${quote(name)})`,
      '',
      `export const ${name}Eq: EqClass.Eq<${name}> = ${isString ? 'S' : 'N'}.Eq`,
      `export const ${name}Ord: OrdClass.Ord<${name}> = ${isString ? 'S' : 'N'}.Ord`,
    ]
  } else {
    const ord =
      ty._tag === 'Literals' && ty.values.every((v) => typeof v === 'string')
        ? [`export const ${name}Ord: OrdClass.Ord<${name}> = S.Ord`]
        : []
    // A recursive schema states its type, which io-ts cannot infer through
    // `t.recursion`, and builds its `Eq` on first use
    const definition = recursive
      ? [
          `export type ${name} = ${typeOf(em, ty)}`,
          '',
          `export const ${name}Json: t.Type<${name}, unknown> = t.recursion<${name}, unknown>(${quote(name)}, () => ${codecOf(em, ty)})`,
          '',
          `export const ${name}Eq: EqClass.Eq<${name}> = lazyEq(() => ${eqOf(em, ty)})`,
        ]
      : [
          `export const ${name}Json = ${codecOf(em, ty)}`,
          '',
          `export type ${name} = t.TypeOf<typeof ${name}Json>`,
          '',
          `export const ${name}Eq: EqClass.Eq<${name}> = ${eqOf(em, ty)}`,
        ]
    return [...doc, ...definition, ...ord]
  }
}

const schemaFileImports: Import[] = [
  { _tag: 'Namespace', alias: 'A', module: 'fp-ts/Array', typeOnly: false },
  { _tag: 'Namespace', alias: 'EqClass', module: 'fp-ts/Eq', typeOnly: false },
  { _tag: 'Namespace', alias: 'OrdClass', module: 'fp-ts/Ord', typeOnly: true },
  { _tag: 'Namespace', alias: 'R', module: 'fp-ts/Record', typeOnly: false },
  { _tag: 'Namespace', alias: 'B', module: 'fp-ts/boolean', typeOnly: false },
  { _tag: 'Namespace', alias: 'N', module: 'fp-ts/number', typeOnly: false },
  { _tag: 'Namespace', alias: 'S', module: 'fp-ts/string', typeOnly: false },
  { _tag: 'Namespace', alias: 't', module: 'io-ts', typeOnly: false },
  ...['NullableEq', 'brandedNumber', 'brandedString', 'nullEq'].map(
    (name): Import => ({
      _tag: 'Named',
      name,
      module: '@rinn7e/tea-cup-prelude',
      typeOnly: false,
    }),
  ),
  ...[
    'BlobJson',
    'discriminatedEq',
    'intersectionEq',
    'lazyEq',
    'structEq',
    'unionEq',
    'unknownEq',
  ].map(
    (name): Import => ({
      _tag: 'Named',
      name,
      module: runtimeModule,
      typeOnly: false,
    }),
  ),
]

export const banner = (specName: string): string[] => [
  `// Generated by tea-cup-api-generator from ${specName}.`,
  '// Do not edit: run `tea-cup-api-generator` instead.',
]

export const schemasFile = (
  em: Emitter,
  entries: Record<string, SchemaEntry>,
  groups: Group[],
  warnings: string[],
): string => {
  const recursiveSchemas = new Set(
    groups.flatMap((g) => (g.recursive ? g.schemas : [])),
  )
  const appImports = typeRefImports([
    ...Object.values(em.options.schemaTypes),
    ...Object.values(em.options.formatTypes),
  ])
  const generated = groups.flatMap((g) =>
    g.schemas.filter((raw) => em.options.schemaTypes[raw] === undefined),
  )
  const blocks = generated.map((raw) =>
    schemaBlock(em, raw, entries[raw], recursiveSchemas.has(raw)).join('\n'),
  )
  const body = blocks.join('\n\n')
  const candidates = [...schemaFileImports, ...appImports]
  checkUnique(
    'schemas',
    generated.flatMap((raw): [string, string][] => {
      const name = em.typeName(raw)
      return [
        [raw, name],
        [`${raw} (codec)`, `${name}Json`],
        [`${raw} (Eq)`, `${name}Eq`],
        [`${raw} (Ord)`, `${name}Ord`],
      ]
    }),
    usedImports(body, candidates).map(importName),
  )
  return [
    ...banner(em.options.specName),
    ...(warnings.length === 0
      ? []
      : ['//', '// Read as unknown:', ...warnings.map((w) => `// - ${w}`)]),
    '',
    ...importLines(body, candidates),
    '',
    body,
    '',
  ].join('\n')
}
