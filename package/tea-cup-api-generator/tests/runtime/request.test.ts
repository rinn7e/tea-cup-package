import * as E from 'fp-ts/Either'
import * as t from 'io-ts'
import { describe, expect, it } from 'vitest'

import {
  type Client,
  type Request,
  blobAnswer,
  definedHeaders,
  jsonAnswer,
  noAnswer,
  pathParam,
  queryString,
  send,
  textAnswer,
} from '../../src'

const request = (overrides: Partial<Request> = {}): Request => ({
  method: 'GET',
  path: '/things',
  query: '',
  headers: undefined,
  body: { _tag: 'None' },
  signal: undefined,
  cache: undefined,
  ...overrides,
})

type Seen = { url: string; init: RequestInit }

const clientAnswering = (
  respond: () => Response | Promise<Response>,
): { client: Client; seen: Seen[] } => {
  const seen: Seen[] = []
  return {
    seen,
    client: {
      baseUrl: 'https://api.test',
      fetch: async (url, init) => {
        seen.push({ url, init })
        return respond()
      },
    },
  }
}

const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), { status })

const ErrorBody = t.type({ message: t.string })

describe('send', () => {
  it('decodes a JSON answer', async () => {
    const { client } = clientAnswering(() => json({ id: 1 }))
    const result = await send(
      client,
      request(),
      jsonAnswer(t.type({ id: t.number })),
      t.unknown,
    )()
    expect(result).toEqual(E.right({ id: 1 }))
  })

  it('does not reach the network until the TaskEither runs', () => {
    const { client, seen } = clientAnswering(() => json(null))
    send(client, request(), noAnswer, t.unknown)
    expect(seen).toEqual([])
  })

  it('sends the method, the URL, the headers and a JSON body', async () => {
    const { client, seen } = clientAnswering(
      () => new Response(null, { status: 204 }),
    )
    await send(
      client,
      request({
        method: 'POST',
        path: '/things/a%20b',
        query: '?x=1',
        headers: { 'X-Id': 7, 'X-Gone': undefined },
        body: { _tag: 'Json', value: { name: 'Rex' } },
      }),
      noAnswer,
      t.unknown,
    )()
    expect(seen[0].url).toBe('https://api.test/things/a%20b?x=1')
    expect(seen[0].init.method).toBe('POST')
    expect(seen[0].init.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Id': '7',
    })
    expect(seen[0].init.body).toBe('{"name":"Rex"}')
  })

  it('answers null for an operation without content', async () => {
    const { client } = clientAnswering(
      () => new Response(null, { status: 204 }),
    )
    expect(await send(client, request(), noAnswer, t.unknown)()).toEqual(
      E.right(null),
    )
  })

  it('reads text and blob answers', async () => {
    const text = clientAnswering(() => new Response('plain'))
    expect(await send(text.client, request(), textAnswer, t.unknown)()).toEqual(
      E.right('plain'),
    )
    const blob = clientAnswering(() => new Response(new Blob(['bytes'])))
    const result = await send(blob.client, request(), blobAnswer, t.unknown)()
    expect(E.isRight(result) && (await result.right.text())).toBe('bytes')
  })

  it('decodes the error body of a failed request', async () => {
    const { client } = clientAnswering(() =>
      json({ message: 'no such thing' }, 404),
    )
    const result = await send(client, request(), noAnswer, ErrorBody)()
    expect(result).toEqual(
      E.left({
        statusCode: 404,
        err: { message: 'no such thing' },
        actualErr: '{"message":"no such thing"}',
      }),
    )
  })

  it('keeps an error body the codec refuses as text only', async () => {
    const { client } = clientAnswering(
      () => new Response('Bad gateway', { status: 502 }),
    )
    const result = await send(client, request(), noAnswer, ErrorBody)()
    expect(result).toEqual(
      E.left({ statusCode: 502, err: null, actualErr: 'Bad gateway' }),
    )
  })

  it('reports a request that got no answer with status 0', async () => {
    const { client } = clientAnswering(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    )
    const result = await send(client, request(), noAnswer, t.unknown)()
    expect(result).toEqual(
      E.left({ statusCode: 0, err: null, actualErr: 'Failed to fetch' }),
    )
  })

  it('reports a malformed answer with its 2xx status', async () => {
    const { client } = clientAnswering(() => json({ id: 'one' }))
    const result = await send(
      client,
      request(),
      jsonAnswer(t.type({ id: t.number })),
      t.unknown,
    )()
    expect(E.isLeft(result) && result.left.statusCode).toBe(200)
    expect(E.isLeft(result) && result.left.err).toBe(null)
    expect(E.isLeft(result) && result.left.actualErr).toContain('{"id":"one"}')
  })

  it('sends a multipart body as form data, leaving its content type to fetch', async () => {
    const { client, seen } = clientAnswering(
      () => new Response(null, { status: 204 }),
    )
    const file = new Blob(['photo'])
    await send(
      client,
      request({
        method: 'PUT',
        body: {
          _tag: 'Multipart',
          value: { file, tags: ['a', 'b'], meta: { x: 1 }, gone: undefined },
        },
      }),
      noAnswer,
      t.unknown,
    )()
    const body = seen[0].init.body as FormData
    expect(seen[0].init.headers).toEqual({})
    expect(body.get('file')).toBeInstanceOf(Blob)
    expect(body.getAll('tags')).toEqual(['a', 'b'])
    expect(body.get('meta')).toBe('{"x":1}')
    expect(body.has('gone')).toBe(false)
  })

  it('sends a URL-encoded body', async () => {
    const { client, seen } = clientAnswering(
      () => new Response(null, { status: 204 }),
    )
    await send(
      client,
      request({
        method: 'POST',
        body: { _tag: 'UrlEncoded', value: { q: 'cat & dog', page: 2 } },
      }),
      noAnswer,
      t.unknown,
    )()
    expect(String(seen[0].init.body)).toBe('q=cat+%26+dog&page=2')
    expect(seen[0].init.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded',
    })
  })
})

describe('queryString', () => {
  it('is empty when every parameter is missing', () => {
    expect(queryString(undefined)).toBe('')
    expect(queryString({ a: undefined, b: null })).toBe('')
  })

  it('repeats the key of an array in the default form style', () => {
    expect(queryString({ ids: [1, 2], q: 'a b' })).toBe('?ids=1&ids=2&q=a%20b')
  })

  it('writes the other styles of an array', () => {
    expect(queryString({ ids: [1, 2] }, { ids: 'formNoExplode' })).toBe(
      '?ids=1%2C2',
    )
    expect(queryString({ ids: [1, 2] }, { ids: 'spaceDelimited' })).toBe(
      '?ids=1%202',
    )
    expect(queryString({ ids: [1, 2] }, { ids: 'pipeDelimited' })).toBe(
      '?ids=1%7C2',
    )
  })

  it('writes an object in the form and deepObject styles', () => {
    expect(queryString({ filter: { a: 1, b: 'x' } })).toBe('?a=1&b=x')
    expect(
      queryString({ filter: { a: 1, b: undefined } }, { filter: 'deepObject' }),
    ).toBe('?filter%5Ba%5D=1')
    expect(
      queryString({ filter: { a: 1, b: 'x' } }, { filter: 'formNoExplode' }),
    ).toBe('?filter=a%2C1%2Cb%2Cx')
  })
})

describe('parameters', () => {
  it('encodes a path parameter, joining an array with commas', () => {
    expect(pathParam('a/b c')).toBe('a%2Fb%20c')
    expect(pathParam([1, 2])).toBe('1%2C2')
  })

  it('drops undefined headers and writes the others as text', () => {
    expect(definedHeaders({ a: 1, b: undefined, c: true })).toEqual({
      a: '1',
      c: 'true',
    })
  })
})
