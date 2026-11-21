import { describe, expect, it } from 'vitest'

import { generate } from '../../src/generator'
import { dependencyGroups } from '../../src/generator/order'

const openapi = (
  schemas: Record<string, unknown>,
  paths: Record<string, unknown> = {},
) => ({
  openapi: '3.0.3',
  paths,
  components: { schemas },
})

const client = { module: './client', name: 'client' }

describe('generate', () => {
  it('needs a spec', () => {
    expect(() => generate({}, {})).toThrow(
      'give an OpenAPI spec, an AsyncAPI spec, or both',
    )
  })

  it('refuses a Swagger 2.0 spec', () => {
    expect(() => generate({ openapi: { swagger: '2.0' } }, {})).toThrow(
      'Swagger 2.0',
    )
  })

  it('needs a client to generate endpoints', () => {
    const spec = openapi({}, { '/a': { get: { responses: { '204': {} } } } })
    expect(() => generate({ openapi: spec }, {})).toThrow(
      'options.client is required',
    )
    expect(generate({ openapi: spec }, { client }).endpoints).toContain(
      'export const getA',
    )
  })

  it('writes no endpoints file for a spec without paths', () => {
    expect(
      generate({ openapi: openapi({ A: { type: 'string' } }) }, {}).endpoints,
    ).toBe(null)
  })

  it('refuses options that name what the spec does not have', () => {
    const spec = openapi({ A: { type: 'string' } })
    expect(() =>
      generate({ openapi: spec }, { rename: { schemas: { B: 'C' } } }),
    ).toThrow('options.rename.schemas names B')
    expect(() =>
      generate({ openapi: spec }, { rename: { operations: { getB: 'c' } } }),
    ).toThrow('options.rename.operations names getB')
  })

  it('refuses two schemas with one name', () => {
    const spec = openapi({
      'pet-id': { type: 'string' },
      PetId: { type: 'string' },
    })
    expect(() => generate({ openapi: spec }, {})).toThrow('both map to PetId')
  })

  it('refuses a schema whose name clashes with an import', () => {
    const spec = openapi({ Name: { type: 'string' } })
    expect(() =>
      generate({ openapi: spec }, { rename: { schemas: { Name: 'S' } } }),
    ).toThrow('both map to S')
  })

  it('refuses a $ref to a schema the spec does not have', () => {
    const spec = openapi({ A: { $ref: '#/components/schemas/Missing' } })
    expect(() => generate({ openapi: spec }, {})).toThrow(
      'names no schema of the spec',
    )
  })

  it('refuses specs that disagree on a shared schema', () => {
    const asyncapi = {
      asyncapi: '3.0.0',
      components: { schemas: { A: { type: 'number' } } },
    }
    expect(() =>
      generate({ openapi: openapi({ A: { type: 'string' } }), asyncapi }, {}),
    ).toThrow('differ on the schemas A')
  })

  it('leaves named plain schemas unbranded when asked', () => {
    const spec = openapi({ A: { type: 'string' } })
    expect(generate({ openapi: spec }, {}).schemas).toContain(
      'brandedString<A>',
    )
    expect(
      generate({ openapi: spec }, { brandNamedPrimitives: false }).schemas,
    ).toContain('export const AJson = t.string')
  })

  it('uses a type of the app in place of a schema', () => {
    const spec = openapi({
      UTCTime: { type: 'string' },
      Event: {
        type: 'object',
        properties: { at: { $ref: '#/components/schemas/UTCTime' } },
      },
    })
    const ref = {
      module: '@/time',
      type: 'Time',
      codec: 'TimeJson',
      eq: 'TimeEq',
    }
    const schemas = generate(
      { openapi: spec },
      { types: { schemas: { UTCTime: ref } } },
    ).schemas
    expect(schemas).toContain("import { TimeEq, TimeJson } from '@/time'")
    expect(schemas).toContain('at: TimeJson')
    expect(schemas).not.toContain('UTCTimeJson')
  })
})

describe('dependencyGroups', () => {
  it('puts each schema after the ones it refers to', () => {
    const groups = dependencyGroups({ A: ['B'], B: ['C'], C: [] })
    expect(groups.map((g) => g.schemas)).toEqual([['C'], ['B'], ['A']])
    expect(groups.every((g) => !g.recursive)).toBe(true)
  })

  it('groups mutually recursive schemas and marks self-reference', () => {
    const groups = dependencyGroups({
      A: ['B'],
      B: ['A', 'C'],
      C: [],
      T: ['T'],
    })
    expect(groups).toEqual([
      { schemas: ['C'], recursive: false },
      { schemas: ['A', 'B'], recursive: true },
      { schemas: ['T'], recursive: true },
    ])
  })
})
