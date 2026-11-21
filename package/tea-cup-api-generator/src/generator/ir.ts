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
import type { TypeRef } from './options'

// Note [The type of a schema]
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~
// The generator first reads every schema into a `Ty`, then writes the codec,
// the TypeScript type and the `Eq` of each `Ty`. A `Ty` has one shape per
// meaning, whatever the spelling in the spec: `nullable: true` (3.0),
// `type: ['string', 'null']` (3.1) and `oneOf: [..., { type: 'null' }]` are all
// a `Union` with `Null`, and `enum` and `const` are both `Literals`. So the
// writers never look at OpenAPI again, and the 3.0 and 3.1 differences live in
// `normalize.ts` only.

export type Literal = string | number | boolean | null

export type Field = {
  key: string
  ty: Ty
  required: boolean
  description: string | undefined
}

export type Discriminator = {
  property: string
  // Each tag value with the member it selects
  mapping: { value: string; ty: Ty }[]
}

export type Ty =
  // A schema of `components.schemas`, by its name in the spec
  | { _tag: 'Ref'; schema: string }
  // A type of the app, given in the options for a `format`
  | { _tag: 'External'; ref: TypeRef }
  | { _tag: 'String' }
  | { _tag: 'Number' }
  | { _tag: 'Boolean' }
  | { _tag: 'Null' }
  | { _tag: 'Unknown' }
  // No value: the item of an array that must be empty (`maxItems: 0`)
  | { _tag: 'Never' }
  // A `format: binary` string, sent as a file
  | { _tag: 'Blob' }
  | { _tag: 'Literals'; values: [Literal, ...Literal[]] }
  | { _tag: 'Array'; items: Ty }
  | { _tag: 'Tuple'; items: [Ty, ...Ty[]] }
  | { _tag: 'Object'; fields: [Field, ...Field[]] }
  // An object of any keys, each holding `values`
  | { _tag: 'Record'; values: Ty }
  | { _tag: 'Union'; members: Ty[]; discriminator: Discriminator | null }
  | { _tag: 'Intersection'; members: Ty[] }

export const refsOf = (ty: Ty): string[] => {
  switch (ty._tag) {
    case 'Ref':
      return [ty.schema]
    case 'Array':
    case 'Record':
      return refsOf(ty._tag === 'Array' ? ty.items : ty.values)
    case 'Tuple':
      return ty.items.flatMap(refsOf)
    case 'Object':
      return ty.fields.flatMap((f) => refsOf(f.ty))
    case 'Union':
    case 'Intersection':
      return ty.members.flatMap(refsOf)
    default:
      return []
  }
}
