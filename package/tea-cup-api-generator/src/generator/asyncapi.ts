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
import type { SchemaEntry } from './emit-schema'
import type { Field, Ty } from './ir'
import { pascalName } from './naming'
import { type Ctx, schemaTy, specError } from './normalize'
import type { Reference, SchemaObject } from './openapi'

// The parts of an AsyncAPI 2.x or 3.x document the generator reads

type Message = {
  name?: string
  summary?: string
  description?: string
  deprecated?: boolean
  // 2.x: the format of `payload`; 3.x puts it in the payload itself
  schemaFormat?: string
  payload?: unknown
}

type MessageOrRef = Message | Reference

type Operation2 = { message?: MessageOrRef | { oneOf: MessageOrRef[] } }

type Channel = {
  description?: string
  // 3.x
  messages?: Record<string, MessageOrRef>
  // 2.x
  publish?: Operation2
  subscribe?: Operation2
}

export type AsyncDocument = {
  asyncapi?: string
  channels?: Record<string, Channel>
  components?: {
    schemas?: Record<string, unknown>
    messages?: Record<string, MessageOrRef>
  }
}

// Note [A payload schema]
// ~~~~~~~~~~~~~~~~~~~~~~~
// A payload, and a schema of `components.schemas` in 3.x, is an AsyncAPI
// schema (a superset of JSON Schema), or a multi-format schema
// `{ schemaFormat, schema }`. The generator reads the AsyncAPI, JSON Schema
// and OpenAPI formats, which it types alike; a payload in another format
// (Avro, RAML) is left out with a warning.

const readableFormat = (format: string | undefined): boolean =>
  format === undefined ||
  format.startsWith('application/vnd.aai.asyncapi') ||
  format.startsWith('application/vnd.oai.openapi') ||
  format.startsWith('application/schema+json') ||
  format.startsWith('application/schema+yaml')

const isRecord = (u: unknown): u is Record<string, unknown> =>
  typeof u === 'object' && u !== null && !Array.isArray(u)

// The schema of a payload or 3.x component; see Note [A payload schema]
const unwrapSchema = (
  value: unknown,
  outerFormat: string | undefined,
):
  | { _tag: 'Schema'; schema: SchemaObject }
  | { _tag: 'Unreadable'; format: string } => {
  if (isRecord(value) && 'schemaFormat' in value && 'schema' in value) {
    const format = String(value.schemaFormat)
    return readableFormat(format)
      ? { _tag: 'Schema', schema: value.schema as SchemaObject }
      : { _tag: 'Unreadable', format }
  } else if (!readableFormat(outerFormat)) {
    return { _tag: 'Unreadable', format: String(outerFormat) }
  } else {
    return { _tag: 'Schema', schema: value as SchemaObject }
  }
}

export const asyncSchemas = (
  doc: AsyncDocument,
  warnings: string[],
): Record<string, SchemaObject> =>
  Object.fromEntries(
    Object.entries(doc.components?.schemas ?? {}).flatMap(([name, value]) => {
      const unwrapped = unwrapSchema(value, undefined)
      if (unwrapped._tag === 'Schema') {
        return [[name, unwrapped.schema]]
      } else {
        warnings.push(
          `components.schemas.${name} of the AsyncAPI spec: a schema in the format ${unwrapped.format}`,
        )
        return []
      }
    }),
  )

// Merging
// -----------------------------------------------------------------

// The JSON of a value with the keys of every object sorted, so two schemas
// compare equal whatever order their documents wrote the keys in
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonical)
  } else if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  } else {
    return value
  }
}

/**
 * The schemas of both documents. A name both have must be the same schema,
 * since a `$ref` from either document then means the same thing: throws when
 * it is not. A spec pair built from one backend shares its schemas this way.
 */
export const mergeSchemas = (
  openApi: Record<string, SchemaObject>,
  asyncApi: Record<string, SchemaObject>,
): Record<string, SchemaObject> => {
  const differing = Object.keys(asyncApi)
    .filter(
      (name) =>
        name in openApi &&
        JSON.stringify(canonical(openApi[name])) !==
          JSON.stringify(canonical(asyncApi[name])),
    )
    .sort()
  if (differing.length > 0) {
    throw new Error(
      `the OpenAPI and AsyncAPI specs differ on the schemas ${differing.join(', ')}`,
    )
  } else {
    return { ...asyncApi, ...openApi }
  }
}

// Channels
// -----------------------------------------------------------------

const messagePrefix = '#/components/messages/'

const resolveMessage = (
  doc: AsyncDocument,
  value: MessageOrRef,
  where: string,
): { message: Message; refName: string | undefined } => {
  if (!('$ref' in value) || typeof value.$ref !== 'string') {
    return { message: value as Message, refName: undefined }
  } else if (!value.$ref.startsWith(messagePrefix)) {
    throw specError(where, `unsupported message $ref ${value.$ref}`)
  } else {
    const name = value.$ref.slice(messagePrefix.length)
    const target = doc.components?.messages?.[name]
    if (target === undefined) {
      throw specError(where, `$ref ${value.$ref} names no message of the spec`)
    } else {
      return {
        message: resolveMessage(doc, target, where).message,
        refName: name,
      }
    }
  }
}

// The messages of a channel by key: its `messages` key (3.x), or the name of
// the message (2.x: its `name`, the name of its `$ref`, else its position)
const channelMessages = (
  doc: AsyncDocument,
  key: string,
  channel: Channel,
): [string, Message][] => {
  const where = `channels.${key}`
  if (channel.messages !== undefined) {
    return Object.entries(channel.messages).map(([messageKey, value]) => [
      messageKey,
      resolveMessage(doc, value, `${where}.messages.${messageKey}`).message,
    ])
  } else {
    const operations = [channel.subscribe, channel.publish].flatMap((op) =>
      op?.message === undefined ? [] : [op.message],
    )
    const listed = operations.flatMap((m) => ('oneOf' in m ? m.oneOf : [m]))
    const named = listed.map((value, i): [string, Message] => {
      const { message, refName } = resolveMessage(
        doc,
        value,
        `${where}.message`,
      )
      return [message.name ?? refName ?? String(i), message]
    })
    // A message both published and subscribed to is one member
    return named.filter(
      ([name], i) => named.findIndex(([other]) => other === name) === i,
    )
  }
}

const singleTag = (field: Field | undefined): string | undefined =>
  field !== undefined &&
  field.required &&
  field.ty._tag === 'Literals' &&
  field.ty.values.length === 1 &&
  typeof field.ty.values[0] === 'string'
    ? field.ty.values[0]
    : undefined

// Note [The tag of a channel]
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~
// AsyncAPI has no `discriminator` on a channel, but its messages often carry
// one: a required property of a single string value (`_tag`, `type`, `event`)
// that differs from message to message. The union of the channel takes the
// first such property of its first message as its discriminator, so its
// `Eq` compares by tag. Without one, the union is compared as an untagged one.

const objectOf = (
  entries: Record<string, SchemaEntry>,
  ty: Ty,
  seen: string[],
): Extract<Ty, { _tag: 'Object' }> | undefined => {
  if (ty._tag === 'Object') {
    return ty
  } else if (ty._tag === 'Ref' && !seen.includes(ty.schema)) {
    const entry = entries[ty.schema]
    return entry === undefined
      ? undefined
      : objectOf(entries, entry.ty, [...seen, ty.schema])
  } else {
    return undefined
  }
}

const tagProperty = (
  entries: Record<string, SchemaEntry>,
  members: Ty[],
): string | undefined => {
  const objects = members.map((m) => objectOf(entries, m, []))
  const first = objects[0]
  return first?.fields
    .map((f) => f.key)
    .find((key) => {
      const tags = objects.map((o) =>
        singleTag(o?.fields.find((f) => f.key === key)),
      )
      return (
        tags.every((tag) => tag !== undefined) &&
        new Set(tags).size === tags.length
      )
    })
}

// The summary of a message documents its tag, in a payload written inline
const withTagDoc = (
  ty: Ty,
  property: string | undefined,
  summary: string | undefined,
): Ty =>
  ty._tag === 'Object' && property !== undefined && summary !== undefined
    ? {
        ...ty,
        fields: ty.fields.map((f) =>
          f.key === property && f.description === undefined
            ? { ...f, description: summary }
            : f,
        ) as typeof ty.fields,
      }
    : ty

/**
 * One schema per channel the options do not leave out: the union of the
 * payloads of its messages (or the one payload of a single message), named
 * `<Channel>Message` unless the options name it.
 */
export const channelEntries = (
  ctx: Ctx,
  doc: AsyncDocument,
  entries: Record<string, SchemaEntry>,
): Record<string, SchemaEntry> => {
  const channels = doc.channels ?? {}
  const unknownChannels = Object.keys(ctx.options.channels).filter(
    (key) => channels[key] === undefined,
  )
  if (unknownChannels.length > 0) {
    throw new Error(
      `options.channels names channels not in the AsyncAPI spec: ${unknownChannels.join(', ')}`,
    )
  } else {
    return Object.fromEntries(
      Object.entries(channels).flatMap(([key, channel]) => {
        const option = ctx.options.channels[key] ?? {}
        if (option === false) {
          return []
        } else {
          const exclude = option.exclude ?? []
          const payloads = channelMessages(doc, key, channel)
            .filter(([messageKey]) => !exclude.includes(messageKey))
            .flatMap(([messageKey, message]) => {
              const where = `channels.${key}.messages.${messageKey}.payload`
              if (message.payload === undefined) {
                return []
              } else {
                const unwrapped = unwrapSchema(
                  message.payload,
                  message.schemaFormat,
                )
                if (unwrapped._tag === 'Unreadable') {
                  ctx.warnings.push(
                    `${where}: a payload in the format ${unwrapped.format}`,
                  )
                  return []
                } else {
                  return [
                    {
                      ty: schemaTy(ctx, unwrapped.schema, where),
                      summary: message.summary,
                    },
                  ]
                }
              }
            })
          const name = option.name ?? `${pascalName(key)}Message`
          const property = tagProperty(
            entries,
            payloads.map((p) => p.ty),
          )
          const members = payloads.map((p) =>
            withTagDoc(p.ty, property, p.summary),
          )
          const description =
            channel.description ?? `A message of the channel ${key}`
          if (members.length === 0) {
            return []
          } else if (name in entries) {
            throw new Error(
              `the messages of channel ${key} are named ${name}, which is a schema of the spec already; name them in options.channels`,
            )
          } else if (members.length === 1) {
            return [[name, { ty: members[0], description, deprecated: false }]]
          } else {
            const tagged =
              property === undefined
                ? null
                : {
                    property,
                    mapping: members.map((ty) => ({
                      value: singleTag(
                        objectOf(entries, ty, [])?.fields.find(
                          (f) => f.key === property,
                        ),
                      ) as string,
                      ty,
                    })),
                  }
            return [
              [
                name,
                {
                  ty: { _tag: 'Union', members, discriminator: tagged } as Ty,
                  description,
                  deprecated: false,
                },
              ],
            ]
          }
        }
      }),
    )
  }
}
