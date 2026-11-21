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
import * as t from 'io-ts'

/**
 * A type the app already has, used in place of a generated one: named exports
 * of `module` for the type, its io-ts codec and its `Eq` (and its `Ord`, for a
 * schema that is ordered).
 */
export const TypeRefJson = t.intersection([
  t.type({
    module: t.string,
    type: t.string,
    codec: t.string,
    eq: t.string,
  }),
  t.partial({ ord: t.string }),
])

export type TypeRef = t.TypeOf<typeof TypeRefJson>

// How the messages of an AsyncAPI channel become a schema: `false` leaves
// the channel out
export const ChannelOptionJson = t.union([
  t.literal(false),
  t.partial({
    // The name of the union of its messages (default `<Channel>Message`)
    name: t.string,
    // The keys of the messages to leave out of the union
    exclude: t.array(t.string),
  }),
])

export type ChannelOption = t.TypeOf<typeof ChannelOptionJson>

/**
 * What `generate` needs besides the specs. Every field has a default
 * (`resolveOptions`), but `client` is required to generate endpoints.
 */
export const OptionsJson = t.partial({
  // The module and export of the `Client` the endpoints are sent through,
  // as the endpoints file imports it
  client: t.type({ module: t.string, name: t.string }),
  // The schemas file as the endpoints file imports it
  schemasModule: t.string,
  // The banner names the spec by this
  specName: t.string,
  naming: t.partial({
    // Around the name of every endpoint function: `call` and `Endpoint`
    // turn `getPet` into `callGetPetEndpoint`
    operationPrefix: t.string,
    operationSuffix: t.string,
    // Left out of the names made from a path (`/api/pets` -> `getPets`)
    stripPathPrefix: t.string,
  }),
  rename: t.partial({
    // Raw schema name -> type name
    schemas: t.record(t.string, t.string),
    // Operation name (its `operationId`, or the name made from its method
    // and path) -> function name
    operations: t.record(t.string, t.string),
  }),
  types: t.partial({
    // Raw schema name -> a type of the app, used wherever the spec refers to
    // the schema; the schema itself is not generated
    schemas: t.record(t.string, TypeRefJson),
    // String `format` -> a type of the app (`date-time` -> a date brand)
    formats: t.record(t.string, TypeRefJson),
  }),
  // A named schema of a plain string or number becomes a branded type
  brandNamedPrimitives: t.boolean,
  // The error body of an operation that declares none
  errorBody: TypeRefJson,
  // AsyncAPI channel key -> how its messages become a schema
  channels: t.record(t.string, ChannelOptionJson),
})

export type Options = t.TypeOf<typeof OptionsJson>

export type ResolvedOptions = {
  client: { module: string; name: string } | null
  schemasModule: string
  specName: string
  operationPrefix: string
  operationSuffix: string
  stripPathPrefix: string
  renameSchemas: Record<string, string>
  renameOperations: Record<string, string>
  schemaTypes: Record<string, TypeRef>
  formatTypes: Record<string, TypeRef>
  brandNamedPrimitives: boolean
  errorBody: TypeRef | null
  channels: Record<string, ChannelOption>
}

export const resolveOptions = (options: Options): ResolvedOptions => ({
  client: options.client ?? null,
  schemasModule: options.schemasModule ?? './schemas',
  specName: options.specName ?? 'an API spec',
  operationPrefix: options.naming?.operationPrefix ?? '',
  operationSuffix: options.naming?.operationSuffix ?? '',
  stripPathPrefix: options.naming?.stripPathPrefix ?? '',
  renameSchemas: options.rename?.schemas ?? {},
  renameOperations: options.rename?.operations ?? {},
  schemaTypes: options.types?.schemas ?? {},
  formatTypes: options.types?.formats ?? {},
  brandNamedPrimitives: options.brandNamedPrimitives ?? true,
  errorBody: options.errorBody ?? null,
  channels: options.channels ?? {},
})
