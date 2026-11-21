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
// The parts of an OpenAPI 3.0 or 3.1 document the generator reads. Every field
// is optional, as specs in the wild leave out what the standard calls
// required; the generator says what it cannot use instead of trusting a type.

export type Reference = { $ref: string }

export type SchemaObject = {
  $ref?: string
  type?: string | string[]
  format?: string
  enum?: unknown[]
  const?: unknown
  nullable?: boolean
  allOf?: SchemaObject[]
  oneOf?: SchemaObject[]
  anyOf?: SchemaObject[]
  discriminator?: { propertyName: string; mapping?: Record<string, string> }
  items?: SchemaObject | SchemaObject[]
  prefixItems?: SchemaObject[]
  maxItems?: number
  properties?: Record<string, SchemaObject>
  required?: string[]
  additionalProperties?: boolean | SchemaObject
  description?: string
  deprecated?: boolean
}

export type MediaType = { schema?: SchemaObject }

export type Content = Record<string, MediaType>

export type ParameterObject = {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  schema?: SchemaObject
  content?: Content
  style?: string
  explode?: boolean
}

export type RequestBodyObject = {
  content?: Content
  required?: boolean
}

export type ResponseObject = {
  content?: Content
}

export type OperationObject = {
  operationId?: string
  summary?: string
  description?: string
  deprecated?: boolean
  parameters?: (ParameterObject | Reference)[]
  requestBody?: RequestBodyObject | Reference
  responses?: Record<string, ResponseObject | Reference>
}

export const methods = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const

export type Method = (typeof methods)[number]

export type PathItemObject = Partial<Record<Method, OperationObject>> & {
  $ref?: string
  parameters?: (ParameterObject | Reference)[]
}

export type Document = {
  openapi?: string
  swagger?: string
  paths?: Record<string, PathItemObject>
  components?: {
    schemas?: Record<string, SchemaObject>
    parameters?: Record<string, ParameterObject | Reference>
    requestBodies?: Record<string, RequestBodyObject | Reference>
    responses?: Record<string, ResponseObject | Reference>
  }
}
