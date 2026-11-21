# `@rinn7e/tea-cup-api-generator`

Generates the API layer of a React Tea-Cup app from its API specs: an OpenAPI 3.0 or 3.1 document, an AsyncAPI 2.x or 3.x document, or both. For every schema it writes an `io-ts` codec, a TypeScript type, an `Eq` and (for ids and string enums) an `Ord`. For every operation it writes a typed function that returns an `fp-ts` `TaskEither<HttpError<E>, A>`, ready for `attemptTE` in `update`. For every AsyncAPI channel it writes a union of the payloads of its messages.

The output reads like hand-written code: one file of schemas, one file of endpoints, formatted with the Prettier config of your project, importing only what it uses.

---

## Features

- **Codecs, types and equality from one source**: `<Name>Json` (the codec), `<Name>` (the type) and `<Name>Eq` for every schema, so a decoded value can sit in a model and a memoized view. See [What it writes](#what-it-writes).
- **Ids that cannot be mixed up**: a named schema of a plain string or number becomes a branded type (`PetId`, `OwnerId`), which only its codec makes, with an `Ord` for sorting.
- **Unions compared the way the spec means them**: a `oneOf` with a `discriminator` compares by its tag first; other unions find the member of each value with its codec.
- **Recursive schemas**: a tree, or schemas that refer to each other, get an explicit type, a `t.recursion` codec and a lazy `Eq`.
- **Lazy requests**: a generated function only describes the request. Nothing reaches the network until the `TaskEither` runs, so a `Cmd` built in `update` and thrown away sends nothing.
- **Your client, your rules**: requests go through a `Client` your app exports (base URL, `fetch`, auth header), named in the config.
- **Typed errors**: the error bodies the spec declares for an operation become `E` in `HttpError<E>`, the error type of `@rinn7e/tea-cup-prelude`.
- **AsyncAPI channels**: the schemas of both specs are merged (a name both define must be the same schema), and each channel gets a union of its message payloads, tagged when its messages carry a tag property.
- **Stale config is an error**: a rename or a type override that names a schema or operation the spec does not have fails the run, so the config cannot drift from the spec.
- **A check mode for CI**: `--check` writes nothing and fails when a generated file is out of date.

---

## Installation

```bash
pnpm add -D @rinn7e/tea-cup-api-generator
```

The generated code needs these at runtime:

```bash
pnpm add @rinn7e/tea-cup-api-generator @rinn7e/tea-cup-prelude fp-ts io-ts
```

Prettier is optional: when it is installed, the files are formatted with the config of your project.

---

## Quick Start

### 1. A client

The generated functions send their requests through a `Client` that your app owns:

```ts
// src/api/client.ts
import type { Client } from '@rinn7e/tea-cup-api-generator'

export const client: Client = {
  baseUrl: import.meta.env.VITE_API_URL,
  fetch: (url, init) =>
    fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${getToken()}` },
    }),
}
```

`fetch` is called only when a request runs, so the header is the one current when the request leaves.

### 2. A config

```json
// tea-cup-api-generator.json
{
  "openapi": "spec/openapi.yaml",
  "out": "src/api/generated",
  "client": { "module": "../client", "name": "client" }
}
```

### 3. Generate

```bash
pnpm tea-cup-api-generator
```

It writes `src/api/generated/schemas.ts` and `src/api/generated/endpoints.ts`. Commit them, or add them to `.gitignore` and run the command before `tsc` and `vite`.

### 4. Call an endpoint from `update`

```ts
import { attemptTE } from '@rinn7e/tea-cup-prelude'

import * as Api from '@/api/generated/endpoints'

case 'Open':
  return [
    { ...model, pet: RD.pending },
    attemptTE(Api.showPetById({ path: { petId: msg.petId } }), (result) => ({
      _tag: 'PetLoaded',
      result,
    })),
  ]
```

For a spec like this one:

```yaml
paths:
  /pets/{petId}:
    get:
      operationId: showPetById
      parameters:
        - { name: petId, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Pet' }
        default:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
```

the endpoints file holds:

```ts
export type ShowPetByIdParams = {
  path: { petId: string }
  signal?: AbortSignal
  cache?: RequestCache
}

export const showPetById = (
  params: ShowPetByIdParams,
): TE.TaskEither<HttpError<Schema.Error>, Schema.Pet> =>
  send(client, { method: 'GET', path: `/pets/${pathParam(params.path.petId)}`, ... },
    jsonAnswer(Schema.PetJson), Schema.ErrorJson)
```

`signal` takes the `AbortSignal` of a `Tracker.task` of `@rinn7e/tea-cup-prelude`, so a request can be cancelled.

---

## The Config

Paths are relative to the config file. Only `out`, and one of `openapi` and `asyncapi`, are required.

| Field                    | Default        | What it does                                                                                                              |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `openapi`                |                | The OpenAPI 3.0 or 3.1 spec, JSON or YAML                                                                                 |
| `asyncapi`               |                | The AsyncAPI 2.x or 3.x spec, JSON or YAML                                                                                |
| `out`                    |                | The folder both files are written to                                                                                      |
| `files.schemas`          | `schemas.ts`   | The schemas file, in `out`                                                                                                |
| `files.endpoints`        | `endpoints.ts` | The endpoints file, in `out`                                                                                              |
| `client`                 |                | `{ module, name }`: the `Client` export, as the endpoints file imports it. Required when the OpenAPI spec has paths       |
| `naming.operationPrefix` | `''`           | Put before every function name: `call` turns `getPet` into `callGetPet`                                                   |
| `naming.operationSuffix` | `''`           | Put after every function name: `Endpoint` gives `getPetEndpoint`                                                          |
| `naming.stripPathPrefix` | `''`           | Left out of the names made from a path: `/api` turns `get /api/pets` into `getPets`                                       |
| `rename.schemas`         | `{}`           | Schema name in the spec to type name in the code                                                                          |
| `rename.operations`      | `{}`           | Operation name (its `operationId`, or the name made from its method and path) to function name                            |
| `types.schemas`          | `{}`           | Schema name to a type of your app, used wherever the spec refers to it. The schema itself is not generated                |
| `types.formats`          | `{}`           | String `format` (`date-time`, `uuid`) to a type of your app                                                               |
| `brandNamedPrimitives`   | `true`         | A named schema of a plain string or number becomes a branded type                                                         |
| `errorBody`              |                | The error body of an operation that declares none (else `unknown`)                                                        |
| `channels`               | `{}`           | AsyncAPI channel to `false` (left out) or `{ name, exclude }`: the name of its union, and message keys to leave out of it |
| `format`                 | `true`         | Format the files with Prettier when it is installed                                                                       |

A type of your app (`types.schemas`, `types.formats`, `errorBody`) is named exports of a module:

```json
{
  "types": {
    "formats": {
      "date-time": {
        "module": "@/type/date-time",
        "type": "DateTime",
        "codec": "DateTimeJson",
        "eq": "DateTimeEq",
        "ord": "DateTimeOrd"
      }
    }
  }
}
```

---

## What it writes

### The schemas file

For each schema of `components.schemas` (of both specs) and each AsyncAPI channel, in an order where each comes after the schemas it uses:

| Schema                                       | Codec                                                        | `Eq`                                  |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| Named plain string or number                 | `brandedString<PetId>('PetId')`, plus `PetIdOrd`             | `S.Eq`, `N.Eq`                        |
| `enum`, `const`                              | `t.keyof`, `t.literal`, plus `<Name>Ord` for strings         | `eqStrict`                            |
| Object                                       | `t.type` for required properties, `t.partial` for the others | `structEq`                            |
| `additionalProperties` only                  | `t.record(t.string, ...)`                                    | `R.getEq`                             |
| Array, tuple (`prefixItems`)                 | `t.array`, `t.tuple`                                         | `A.getEq`, `Eq.tuple`                 |
| `allOf`                                      | `t.intersection`                                             | `intersectionEq`                      |
| `oneOf` / `anyOf` with a `discriminator`     | `t.union`                                                    | `discriminatedEq` (tag, then member)  |
| Other `oneOf` / `anyOf`                      | `t.union`                                                    | `unionEq` (member found by its codec) |
| Nullable (`nullable`, `type: [..., 'null']`) | `t.union([..., t.null])`                                     | `NullableEq`                          |
| `format: binary`                             | `BlobJson`                                                   | reference equality                    |
| No type                                      | `t.unknown`                                                  | `unknownEq` (deep JSON equality)      |

A `description` becomes a doc comment, and `deprecated: true` a `@deprecated` tag. A schema the generator cannot type (an unknown `type`, an enum of objects) is read as `unknown` and listed at the top of the file.

### The endpoints file

One function per operation, named by its `operationId` (else by its method and path: `get /pets/{petId}` is `getPetsByPetId`), with a `<Name>Params` type:

- `path`, `query`, `header`: the parameters of the operation and of its path item. Query parameters follow their `style` and `explode` (`form`, `spaceDelimited`, `pipeDelimited`, `deepObject`).
- `body`: JSON, `multipart/form-data` and `application/x-www-form-urlencoded` take the typed schema; `text/plain` a `string`; any other media type a `Blob`, sent with its content type.
- The answer of the first 2xx response: decoded JSON, a `string` for `text/*`, a `Blob` for other media types, and `null` without content (or for an array that must be empty, `maxItems: 0`).
- The error: the union of the JSON bodies of the other responses (`4xx`, `default`).

The file ends with `operations`, the method and path of each function, for contract tests. An operation it cannot generate (a required cookie parameter, a path parameter that is not declared) is left out and listed at the top of the file, with why.

### Errors

Every failure is an `HttpError<E>` of `@rinn7e/tea-cup-prelude`:

| What happened                                | `statusCode`    | `err`                               | `actualErr`              |
| -------------------------------------------- | --------------- | ----------------------------------- | ------------------------ |
| The server answered a status that is not 2xx | that status     | the error body, decoded (or `null`) | the body as text         |
| No answer (network down, CORS, aborted)      | `0`             | `null`                              | the message of the error |
| A 2xx answer the operation does not accept   | that 2xx status | `null`                              | why it was refused       |

---

## AsyncAPI

The generator reads the `components.schemas` of the AsyncAPI spec next to those of the OpenAPI spec. A name both define must be the same schema (compared as JSON, in any key order), so a `$ref` means the same thing in either. Payloads may be written as AsyncAPI, JSON Schema or OpenAPI schemas; a payload in another format (Avro, RAML) is left out with a warning.

Each channel becomes one schema, `<Channel>Message` (or the `name` of its `channels` entry): the union of the payloads of its messages, or the one payload of a channel with a single message. When every message carries a required property with a single string value, different in each (`_tag`, `type`, `event`), the union is tagged by it, and the `summary` of each message documents its tag. For example:

```json
{
  "asyncapi": "spec/asyncapi.yaml",
  "channels": {
    "events": { "name": "ServerEvent", "exclude": ["ping"] },
    "internal": false
  }
}
```

---

## Not supported

- Swagger 2.0: convert it to OpenAPI 3 first (for example with `swagger2openapi`).
- A spec split over several files: bundle it first (for example with `redocly bundle`).
- Cookie parameters (a browser request cannot set them): an optional one is ignored, a required one leaves its operation out.
- `readOnly` and `writeOnly`: a schema has one type for requests and answers.
- Constraints (`minLength`, `pattern`, `minimum`) are not checked by the codecs.

---

## Development

```bash
pnpm install
pnpm test
pnpm run staged
```

The tests generate three fixture projects (`tests/fixture/`) and compare them with the checked-in output under each `out/`, which the type check and `tests/generated/` then run against. After a change to the generator, run `pnpm vitest run -u` and read the diff of the generated files.

---

## License

MIT. See [LICENSE](LICENSE).
