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
  type AsyncDocument,
  asyncSchemas,
  channelEntries,
  mergeSchemas,
} from './asyncapi'
import { type Skipped, endpointsFile } from './emit-endpoint'
import { type Emitter, type SchemaEntry, schemasFile } from './emit-schema'
import { refsOf } from './ir'
import { schemaTypeName } from './naming'
import { type Ctx, schemaTy } from './normalize'
import type { Document } from './openapi'
import { type Options, resolveOptions } from './options'
import { dependencyGroups } from './order'

export type Input = {
  // An OpenAPI 3.0 or 3.1 document, parsed
  openapi?: unknown
  // An AsyncAPI 2.x or 3.x document, parsed
  asyncapi?: unknown
}

export type Output = {
  schemas: string
  // `null` without an OpenAPI spec, or with one that has no paths
  endpoints: string | null
  // The operations the endpoints file leaves out, and why
  skipped: Skipped[]
  // What was read as `unknown`
  warnings: string[]
}

const isRecord = (u: unknown): u is Record<string, unknown> =>
  typeof u === 'object' && u !== null && !Array.isArray(u)

const openApiDocument = (value: unknown): Document | undefined => {
  if (value === undefined) {
    return undefined
  } else if (!isRecord(value)) {
    throw new Error('the OpenAPI spec is not an object')
  } else if (typeof value.swagger === 'string') {
    throw new Error(
      'the spec is Swagger 2.0: convert it to OpenAPI 3 first (for example with swagger2openapi)',
    )
  } else if (
    typeof value.openapi !== 'string' ||
    !value.openapi.startsWith('3.')
  ) {
    throw new Error('the OpenAPI spec has no `openapi: 3.x` field')
  } else {
    return value as Document
  }
}

const asyncApiDocument = (value: unknown): AsyncDocument | undefined => {
  if (value === undefined) {
    return undefined
  } else if (
    !isRecord(value) ||
    typeof value.asyncapi !== 'string' ||
    !/^[23]\./.test(value.asyncapi)
  ) {
    throw new Error('the AsyncAPI spec has no `asyncapi: 2.x` or `3.x` field')
  } else {
    return value as AsyncDocument
  }
}

const throwOnUnknown = (
  what: string,
  keys: string[],
  known: string[],
): void => {
  const unknown = keys.filter((key) => !known.includes(key)).sort()
  if (unknown.length > 0) {
    throw new Error(
      `${what} names ${unknown.join(', ')}, which the specs do not have`,
    )
  }
}

/**
 * The schemas file, and the endpoints file of an OpenAPI spec, as source
 * text (not formatted). Throws when a spec cannot be read or the options name
 * what the specs do not have; an operation it cannot generate is listed in
 * `skipped` instead.
 */
export const generate = (input: Input, options: Options): Output => {
  const openApi = openApiDocument(input.openapi)
  const asyncApi = asyncApiDocument(input.asyncapi)
  if (openApi === undefined && asyncApi === undefined) {
    throw new Error('give an OpenAPI spec, an AsyncAPI spec, or both')
  } else {
    const resolved = resolveOptions(options)
    const warnings: string[] = []
    const schemas = mergeSchemas(
      openApi?.components?.schemas ?? {},
      asyncApi === undefined ? {} : asyncSchemas(asyncApi, warnings),
    )
    const ctx: Ctx = {
      doc: { ...openApi, components: { ...openApi?.components, schemas } },
      options: resolved,
      warnings,
    }
    const componentEntries: Record<string, SchemaEntry> = Object.fromEntries(
      Object.entries(schemas).map(([raw, s]) => [
        raw,
        {
          ty: schemaTy(ctx, s, `components.schemas.${raw}`),
          description: s.description,
          deprecated: s.deprecated === true,
        },
      ]),
    )
    const entries = {
      ...componentEntries,
      ...(asyncApi === undefined
        ? {}
        : channelEntries(ctx, asyncApi, componentEntries)),
    }
    throwOnUnknown(
      'options.rename.schemas',
      Object.keys(resolved.renameSchemas),
      Object.keys(entries),
    )
    throwOnUnknown(
      'options.types.schemas',
      Object.keys(resolved.schemaTypes),
      Object.keys(componentEntries),
    )

    const typeName = schemaTypeName(resolved)
    // A schema the options replace with a type of the app is not generated,
    // so the others do not depend on it
    const graph = Object.fromEntries(
      Object.entries(entries)
        .filter(([raw]) => resolved.schemaTypes[raw] === undefined)
        .map(([raw, entry]) => [raw, refsOf(entry.ty)]),
    )
    const schemaEmitter: Emitter = { options: resolved, typeName, prefix: '' }
    const groups = dependencyGroups(graph)

    const hasPaths =
      openApi !== undefined && Object.keys(openApi.paths ?? {}).length > 0
    if (hasPaths && resolved.client === null) {
      throw new Error(
        'options.client is required to generate the endpoints of the OpenAPI spec',
      )
    } else {
      const endpoints = hasPaths
        ? endpointsFile(ctx, { options: resolved, typeName, prefix: 'Schema.' })
        : null
      throwOnUnknown(
        'options.rename.operations',
        Object.keys(resolved.renameOperations),
        endpoints?.bases ?? [],
      )
      return {
        // Written after the endpoints, which can warn too
        schemas: schemasFile(schemaEmitter, entries, groups, ctx.warnings),
        endpoints: endpoints === null ? null : endpoints.code,
        skipped: endpoints === null ? [] : endpoints.skipped,
        warnings: ctx.warnings,
      }
    }
  }
}
