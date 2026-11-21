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
import type { HttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import * as E from 'fp-ts/Either'
import type * as TE from 'fp-ts/TaskEither'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'

// Client
// -----------------------------------------------------------------

/**
 * Where the generated functions send their requests. The app owns it, so it
 * decides the base URL and what every request carries (an `Authorization`
 * header, credentials, a timeout). `fetch` is called only when the
 * `TaskEither` of a request runs, so a request described in `update` and never
 * performed never reaches the network.
 */
export type Client = {
  baseUrl: string
  fetch: (url: string, init: RequestInit) => Promise<Response>
}

// Request
// -----------------------------------------------------------------

export type Body =
  | { _tag: 'None' }
  | { _tag: 'Json'; value: unknown }
  | { _tag: 'Text'; value: string }
  | { _tag: 'Blob'; value: Blob; contentType: string }
  | { _tag: 'Multipart'; value: Record<string, unknown> }
  | { _tag: 'UrlEncoded'; value: Record<string, unknown> }

export type HeaderValue = string | number | boolean

export type Request = {
  method: string
  // The path with its parameters filled in and encoded, starting with `/`
  path: string
  // `''`, or the query string with its `?` (`queryString`)
  query: string
  headers: Record<string, HeaderValue | undefined> | undefined
  body: Body
  signal: AbortSignal | undefined
  cache: RequestCache | undefined
}

/**
 * How the success answer of an operation is read: its body decoded as JSON,
 * as text, as a `Blob`, or ignored (`null`) when the operation answers no
 * content. A `Left` holds why the body was refused, kept in the
 * `HttpError.actualErr` of the request.
 */
export type Answer<A> = (res: Response) => Promise<E.Either<string, A>>

export const jsonAnswer =
  <A>(decoder: t.Decoder<unknown, A>): Answer<A> =>
  async (res) => {
    const text = await res.text()
    const json = parseJson(text)
    if (E.isLeft(json)) {
      return E.left(text)
    } else {
      const decoded = decoder.decode(json.right)
      if (E.isRight(decoded)) {
        return E.right(decoded.right)
      } else {
        return E.left(
          `${PathReporter.report(decoded).join('\n')}\nin the answer ${text}`,
        )
      }
    }
  }

export const textAnswer: Answer<string> = async (res) =>
  E.right(await res.text())

export const blobAnswer: Answer<Blob> = async (res) => E.right(await res.blob())

export const noAnswer: Answer<null> = async () => E.right(null)

const parseJson = (text: string): E.Either<unknown, unknown> =>
  E.tryCatch(
    () => JSON.parse(text),
    (err) => err,
  )

// Note [The error of a request]
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Every failure of a request is an `HttpError<E>` of tea-cup-prelude, where
// `E` is the error body the spec declares for the operation:
//
// - the server answered a status that is not 2xx: `statusCode` is that status,
//   `err` the body decoded with the error codec (`null` when it does not
//   decode), `actualErr` the body as text;
// - the request never got an answer (no network, CORS, aborted):
//   `statusCode` is 0 and `actualErr` the message of the thrown error;
// - the server answered 2xx with a body the operation does not accept:
//   `statusCode` is that 2xx status, `err` is `null` and `actualErr` says why.
//   A 2xx error therefore means a malformed answer, not a failed request.

/**
 * Sends a request through the client and reads its answer. This is what every
 * generated function calls; it is exported for the requests a spec cannot
 * describe.
 */
export const send =
  <E, A>(
    client: Client,
    request: Request,
    answer: Answer<A>,
    errorDecoder: t.Decoder<unknown, E>,
  ): TE.TaskEither<HttpError<E>, A> =>
  async () => {
    const response = await fetchResponse(client, request)
    if (E.isLeft(response)) {
      return E.left({ statusCode: 0, err: null, actualErr: response.left })
    } else {
      const res = response.right
      if (res.ok) {
        const read = await readAnswer(answer, res)
        return E.mapLeft(
          (actualErr: string): HttpError<E> => ({
            statusCode: res.status,
            err: null,
            actualErr,
          }),
        )(read)
      } else {
        return E.left(await readError(errorDecoder, res))
      }
    }
  }

const fetchResponse = async (
  client: Client,
  request: Request,
): Promise<E.Either<string, Response>> => {
  try {
    const response = await client.fetch(
      `${client.baseUrl}${request.path}${request.query}`,
      {
        method: request.method,
        headers: requestHeaders(request),
        body: requestBody(request.body),
        signal: request.signal,
        cache: request.cache,
      },
    )
    return E.right(response)
  } catch (err) {
    return E.left(errorMessage(err))
  }
}

const readAnswer = async <A>(
  answer: Answer<A>,
  res: Response,
): Promise<E.Either<string, A>> => {
  try {
    return await answer(res)
  } catch (err) {
    return E.left(errorMessage(err))
  }
}

const readError = async <E>(
  errorDecoder: t.Decoder<unknown, E>,
  res: Response,
): Promise<HttpError<E>> => {
  const text = await res.text().catch(() => '')
  const json = parseJson(text)
  const decoded = E.isRight(json)
    ? errorDecoder.decode(json.right)
    : errorDecoder.decode(text)
  return {
    statusCode: res.status,
    err: E.isRight(decoded) ? decoded.right : null,
    actualErr: text,
  }
}

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err)

// The content type of a multipart body is left to fetch, which adds the
// boundary of the form
const requestHeaders = (request: Request): Record<string, string> => {
  const contentType = contentTypeOf(request.body)
  const given = definedHeaders(request.headers)
  if (contentType === undefined) {
    return given
  } else {
    return { 'Content-Type': contentType, ...given }
  }
}

const contentTypeOf = (body: Body): string | undefined => {
  switch (body._tag) {
    case 'None':
      return undefined
    case 'Json':
      return 'application/json'
    case 'Text':
      return 'text/plain'
    case 'Blob':
      return body.contentType
    case 'Multipart':
      return undefined
    case 'UrlEncoded':
      return 'application/x-www-form-urlencoded'
  }
}

const requestBody = (body: Body): BodyInit | undefined => {
  switch (body._tag) {
    case 'None':
      return undefined
    case 'Json':
      return JSON.stringify(body.value)
    case 'Text':
      return body.value
    case 'Blob':
      return body.value
    case 'Multipart':
      return formData(body.value)
    case 'UrlEncoded':
      return new URLSearchParams(formPairs(body.value))
  }
}

// A field of a form body: a `Blob` is sent as a file, an array repeats its
// key, an object is sent as JSON (the default `contentType` of a multipart
// object property), and an undefined or null field is left out
const formData = (value: Record<string, unknown>): FormData => {
  const data = new FormData()
  Object.entries(value).forEach(([key, field]) => {
    asList(field).forEach((item) => {
      if (item instanceof Blob) {
        data.append(key, item)
      } else {
        data.append(key, formValue(item))
      }
    })
  })
  return data
}

const formPairs = (value: Record<string, unknown>): [string, string][] =>
  Object.entries(value).flatMap(([key, field]) =>
    asList(field).map((item): [string, string] => [key, formValue(item)]),
  )

const asList = (field: unknown): unknown[] => {
  if (field === undefined || field === null) {
    return []
  } else if (Array.isArray(field)) {
    return field.filter((item) => item !== undefined && item !== null)
  } else {
    return [field]
  }
}

const formValue = (item: unknown): string =>
  typeof item === 'object' ? JSON.stringify(item) : String(item)

// Parameters
// -----------------------------------------------------------------

/**
 * How a query parameter is written, after the `style` and `explode` of
 * OpenAPI. The default is `form` with `explode` (`ids=1&ids=2`, and each field
 * of an object as its own parameter).
 */
export type QueryStyle =
  | 'form'
  | 'formNoExplode'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject'

/**
 * The query string of a request, `?` included, or `''` when every parameter
 * is undefined or null. `styles` gives the parameters that are not written in
 * the default `form` style.
 */
export const queryString = (
  query: Record<string, unknown> | undefined,
  styles: Record<string, QueryStyle> = {},
): string => {
  const pairs = Object.entries(query ?? {}).flatMap(([name, value]) =>
    queryPairs(name, value, styles[name] ?? 'form'),
  )
  if (pairs.length === 0) {
    return ''
  } else {
    return `?${pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
  }
}

const queryPairs = (
  name: string,
  value: unknown,
  style: QueryStyle,
): [string, string][] => {
  if (value === undefined || value === null) {
    return []
  } else if (Array.isArray(value)) {
    const items = value.map(String)
    switch (style) {
      case 'form':
      case 'deepObject':
        return items.map((item): [string, string] => [name, item])
      case 'formNoExplode':
        return [[name, items.join(',')]]
      case 'spaceDelimited':
        return [[name, items.join(' ')]]
      case 'pipeDelimited':
        return [[name, items.join('|')]]
    }
  } else if (typeof value === 'object') {
    const fields = Object.entries(value).filter(
      ([, field]) => field !== undefined && field !== null,
    )
    switch (style) {
      case 'deepObject':
        return fields.map(([key, field]): [string, string] => [
          `${name}[${key}]`,
          String(field),
        ])
      case 'formNoExplode':
        return [[name, fields.flatMap(([k, f]) => [k, String(f)]).join(',')]]
      case 'form':
      case 'spaceDelimited':
      case 'pipeDelimited':
        return fields.map(([key, field]): [string, string] => [
          key,
          String(field),
        ])
    }
  } else {
    return [[name, String(value)]]
  }
}

// A path parameter, in the default `simple` style: an array is comma-separated
export const pathParam = (value: HeaderValue | HeaderValue[]): string =>
  encodeURIComponent(Array.isArray(value) ? value.join(',') : String(value))

// The header parameters of a request, without those left undefined
export const definedHeaders = (
  headers: Record<string, HeaderValue | undefined> | undefined,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers ?? {}).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  )

// Codecs
// -----------------------------------------------------------------

// The value of a `format: binary` property, which only a form body or a raw
// body can carry
export const BlobJson = new t.Type<Blob, Blob, unknown>(
  'Blob',
  (u): u is Blob => u instanceof Blob,
  (u, c) => (u instanceof Blob ? t.success(u) : t.failure(u, c)),
  t.identity,
)
