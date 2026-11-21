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
import type { Discriminator, Field, Literal, Ty } from './ir'
import type { Document, Reference, SchemaObject } from './openapi'
import type { ResolvedOptions } from './options'

// See Note [The type of a schema]

export type Ctx = {
  doc: Document
  options: ResolvedOptions
  // What the generator read as `unknown`, for the banner of the schemas file
  warnings: string[]
}

const schemaPrefix = '#/components/schemas/'

const unknownTy: Ty = { _tag: 'Unknown' }
const nullTy: Ty = { _tag: 'Null' }

export const specError = (where: string, message: string): Error =>
  new Error(`${where}: ${message}`)

const warn = (ctx: Ctx, where: string, message: string): Ty => {
  ctx.warnings.push(`${where}: ${message}`)
  return unknownTy
}

// A JSON pointer token: `~1` is `/` and `~0` is `~`, after percent-decoding
const pointerToken = (token: string): string =>
  decodeURIComponent(token).replaceAll('~1', '/').replaceAll('~0', '~')

export const schemaTy = (ctx: Ctx, s: SchemaObject, where: string): Ty => {
  const base = coreTy(ctx, s, where)
  return s.nullable === true ? withNull(base) : base
}

const withNull = (ty: Ty): Ty => {
  switch (ty._tag) {
    case 'Null':
    case 'Unknown':
      return ty
    case 'Literals':
      return ty.values.includes(null)
        ? ty
        : { _tag: 'Literals', values: [...ty.values, null] }
    case 'Union':
      return ty.members.some((m) => m._tag === 'Null')
        ? ty
        : { ...ty, members: [...ty.members, nullTy] }
    default:
      return { _tag: 'Union', members: [ty, nullTy], discriminator: null }
  }
}

const coreTy = (ctx: Ctx, s: SchemaObject, where: string): Ty => {
  if (s.$ref !== undefined) {
    return refTy(ctx, s.$ref, where)
  } else if ('const' in s) {
    return literalsTy(ctx, [s.const], where)
  } else if (s.enum !== undefined) {
    return literalsTy(ctx, s.enum, where)
  } else if (s.allOf !== undefined) {
    return allOfTy(ctx, s, s.allOf, where)
  } else if (s.oneOf !== undefined || s.anyOf !== undefined) {
    return unionTy(ctx, s, s.oneOf ?? s.anyOf ?? [], where)
  } else {
    return typedTy(ctx, s, where)
  }
}

export const refTy = (ctx: Ctx, ref: string, where: string): Ty => {
  if (!ref.startsWith(schemaPrefix)) {
    throw specError(
      where,
      `unsupported $ref ${ref}: only #/components/schemas/<name> is read; bundle a spec split over several files first`,
    )
  } else {
    const name = pointerToken(ref.slice(schemaPrefix.length))
    if (ctx.doc.components?.schemas?.[name] === undefined) {
      throw specError(where, `$ref ${ref} names no schema of the spec`)
    } else {
      return { _tag: 'Ref', schema: name }
    }
  }
}

const isLiteral = (value: unknown): value is Literal =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'

const literalsTy = (ctx: Ctx, values: unknown[], where: string): Ty => {
  const [first, ...rest] = values
  if (!values.every(isLiteral)) {
    return warn(ctx, where, 'an enum of objects or arrays')
  } else if (first === undefined) {
    return { _tag: 'Never' }
  } else if (first === null && rest.length === 0) {
    return nullTy
  } else {
    return {
      _tag: 'Literals',
      values: [first as Literal, ...(rest as Literal[])],
    }
  }
}

// The properties written next to `allOf` or `oneOf` are one more part
const ownShape = (ctx: Ctx, s: SchemaObject, where: string): Ty | undefined => {
  if (s.properties !== undefined && Object.keys(s.properties).length > 0) {
    return objectTy(ctx, s, where)
  } else {
    return undefined
  }
}

const isAnyObject = (ty: Ty): boolean =>
  ty._tag === 'Unknown' ||
  (ty._tag === 'Record' && ty.values._tag === 'Unknown')

const allOfTy = (
  ctx: Ctx,
  s: SchemaObject,
  parts: SchemaObject[],
  where: string,
): Ty => {
  const own = ownShape(ctx, s, where)
  const all = [
    ...parts.map((part, i) => schemaTy(ctx, part, `${where}.allOf[${i}]`)),
    ...(own === undefined ? [] : [own]),
  ]
  // A part that only lists `required` or says `type: object` adds nothing
  const members = all.filter((m) => !isAnyObject(m))
  if (members.length === 0) {
    return all.length === 0 ? unknownTy : all[0]
  } else if (members.length === 1) {
    return members[0]
  } else {
    return { _tag: 'Intersection', members }
  }
}

const unionTy = (
  ctx: Ctx,
  s: SchemaObject,
  options: SchemaObject[],
  where: string,
): Ty => {
  const keyword = s.oneOf !== undefined ? 'oneOf' : 'anyOf'
  const members = options.map((m, i) =>
    schemaTy(ctx, m, `${where}.${keyword}[${i}]`),
  )
  const union: Ty =
    members.length === 1
      ? members[0]
      : {
          _tag: 'Union',
          members,
          discriminator: discriminatorOf(ctx, s, members, where),
        }
  const own = ownShape(ctx, s, where)
  if (own === undefined) {
    return union
  } else {
    return { _tag: 'Intersection', members: [union, own] }
  }
}

// The tag of each member: its `mapping` entry, else the name of its schema.
// Without a `$ref` for every member there is no schema to name, so the union
// is compared without its tag.
const discriminatorOf = (
  ctx: Ctx,
  s: SchemaObject,
  members: Ty[],
  where: string,
): Discriminator | null => {
  const refs = members.flatMap((m) => (m._tag === 'Ref' ? [m.schema] : []))
  const values = members.filter((m) => m._tag !== 'Null')
  if (s.discriminator === undefined || refs.length !== values.length) {
    return null
  } else {
    const explicit = Object.entries(s.discriminator.mapping ?? {}).map(
      ([value, target]) => {
        const ref = target.startsWith('#') ? target : `${schemaPrefix}${target}`
        return {
          value,
          ty: refTy(ctx, ref, `${where}.discriminator.mapping.${value}`),
        }
      },
    )
    const mapped = explicit.flatMap((e) =>
      e.ty._tag === 'Ref' ? [e.ty.schema] : [],
    )
    const implicit = refs
      .filter((schema) => !mapped.includes(schema))
      .map((schema): { value: string; ty: Ty } => ({
        value: schema,
        ty: { _tag: 'Ref', schema },
      }))
    return {
      property: s.discriminator.propertyName,
      mapping: [...explicit, ...implicit],
    }
  }
}

const typesOf = (s: SchemaObject): string[] => {
  if (Array.isArray(s.type)) {
    return s.type
  } else if (s.type !== undefined) {
    return [s.type]
  } else if (
    s.properties !== undefined ||
    s.additionalProperties !== undefined
  ) {
    return ['object']
  } else if (s.items !== undefined || s.prefixItems !== undefined) {
    return ['array']
  } else {
    return []
  }
}

const typedTy = (ctx: Ctx, s: SchemaObject, where: string): Ty => {
  const types = typesOf(s)
  if (types.length === 0) {
    return unknownTy
  } else if (types.length === 1) {
    return singleTy(ctx, s, types[0], where)
  } else {
    return {
      _tag: 'Union',
      members: types.map((type) => singleTy(ctx, s, type, where)),
      discriminator: null,
    }
  }
}

const formatTy = (ctx: Ctx, s: SchemaObject): Ty | undefined => {
  const ref =
    s.format === undefined ? undefined : ctx.options.formatTypes[s.format]
  return ref === undefined ? undefined : { _tag: 'External', ref }
}

const singleTy = (
  ctx: Ctx,
  s: SchemaObject,
  type: string,
  where: string,
): Ty => {
  switch (type) {
    case 'string':
      return (
        formatTy(ctx, s) ??
        (s.format === 'binary' ? { _tag: 'Blob' } : { _tag: 'String' })
      )
    case 'integer':
    case 'number':
      return formatTy(ctx, s) ?? { _tag: 'Number' }
    case 'boolean':
      return { _tag: 'Boolean' }
    case 'null':
      return nullTy
    case 'array':
      return arrayTy(ctx, s, where)
    case 'object':
      return objectTy(ctx, s, where)
    default:
      return warn(ctx, where, `an unknown type ${type}`)
  }
}

// Note [A tuple]
// ~~~~~~~~~~~~~~
// A tuple is `prefixItems` (3.1), or `items` given as an array (which some
// 3.0 generators write). io-ts types `t.tuple` for up to five items, so a
// longer tuple is read as an array of the union of its items.

const arrayTy = (ctx: Ctx, s: SchemaObject, where: string): Ty => {
  const tuple = s.prefixItems ?? (Array.isArray(s.items) ? s.items : undefined)
  if (tuple !== undefined) {
    const items = tuple.map((item, i) =>
      schemaTy(ctx, item, `${where}.prefixItems[${i}]`),
    )
    const [first, ...rest] = items
    if (first === undefined) {
      return { _tag: 'Array', items: { _tag: 'Never' } }
    } else if (items.length <= 5) {
      return { _tag: 'Tuple', items: [first, ...rest] }
    } else {
      // See Note [A tuple]
      return {
        _tag: 'Array',
        items: { _tag: 'Union', members: items, discriminator: null },
      }
    }
  } else if (s.maxItems === 0) {
    return { _tag: 'Array', items: { _tag: 'Never' } }
  } else if (s.items === undefined || Array.isArray(s.items)) {
    return { _tag: 'Array', items: unknownTy }
  } else {
    return { _tag: 'Array', items: schemaTy(ctx, s.items, `${where}.items`) }
  }
}

// Note [Extra properties]
// ~~~~~~~~~~~~~~~~~~~~~~~
// An object with `properties` is decoded by its properties, and keeps the
// keys it does not list (io-ts `t.type` does not strip them), whatever its
// `additionalProperties`. An object without `properties` is a record of
// `additionalProperties`, or of `unknown`.

const objectTy = (ctx: Ctx, s: SchemaObject, where: string): Ty => {
  const required = s.required ?? []
  const fields: Field[] = Object.entries(s.properties ?? {}).map(
    ([key, prop]) => ({
      key,
      ty: schemaTy(ctx, prop, `${where}.properties.${key}`),
      required: required.includes(key),
      description: prop.description,
    }),
  )
  const [first, ...rest] = fields
  if (first !== undefined) {
    return { _tag: 'Object', fields: [first, ...rest] }
  } else if (typeof s.additionalProperties === 'object') {
    return {
      _tag: 'Record',
      values: schemaTy(
        ctx,
        s.additionalProperties,
        `${where}.additionalProperties`,
      ),
    }
  } else {
    return { _tag: 'Record', values: unknownTy }
  }
}

// Components other than schemas
// -----------------------------------------------------------------

const isReference = (value: object): value is Reference =>
  '$ref' in value && typeof value.$ref === 'string'

/**
 * A parameter, request body or response, following its `$ref` into
 * `components` (and the `$ref` found there, if any).
 */
export const resolve = <T extends object>(
  ctx: Ctx,
  kind: 'parameters' | 'requestBodies' | 'responses',
  value: T | Reference,
  where: string,
): T => {
  const go = (current: T | Reference, seen: string[]): T => {
    if (!isReference(current)) {
      return current
    } else {
      const prefix = `#/components/${kind}/`
      if (!current.$ref.startsWith(prefix)) {
        throw specError(where, `unsupported $ref ${current.$ref}`)
      } else if (seen.includes(current.$ref)) {
        throw specError(where, `$ref ${current.$ref} refers to itself`)
      } else {
        const name = pointerToken(current.$ref.slice(prefix.length))
        const target = ctx.doc.components?.[kind]?.[name]
        if (target === undefined) {
          throw specError(
            where,
            `$ref ${current.$ref} names nothing in the spec`,
          )
        } else {
          return go(target as T | Reference, [...seen, current.$ref])
        }
      }
    }
  }
  return go(value, [])
}
