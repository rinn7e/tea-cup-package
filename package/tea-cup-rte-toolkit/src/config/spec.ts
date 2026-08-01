import { Option, fromNullable } from 'fp-ts/lib/Option'

import { ElementDefinition, MarkDefinition } from '../internal/definitions'

export type SpecContents = {
  readonly marks: Array<MarkDefinition>
  readonly nameToMark: Record<string, MarkDefinition>
  readonly elements: Array<ElementDefinition>
  readonly nameToElement: Record<string, ElementDefinition>
}

export type Spec = { readonly _tag: 'Spec'; readonly contents: SpecContents }

export const emptySpec: Spec = {
  _tag: 'Spec',
  contents: {
    marks: [],
    nameToMark: {},
    elements: [],
    nameToElement: {},
  },
}

export function markDefinitions(spec: Spec): Array<MarkDefinition> {
  return spec.contents.marks
}

export function elementDefinitions(spec: Spec): Array<ElementDefinition> {
  return spec.contents.elements
}

export function withMarkDefinitions(
  marks: Array<MarkDefinition>,
  spec: Spec,
): Spec {
  const nameToMark: Record<string, MarkDefinition> = {}
  for (const m of marks) {
    nameToMark[m.contents.name] = m
  }
  return {
    _tag: 'Spec',
    contents: {
      ...spec.contents,
      marks,
      nameToMark,
    },
  }
}

export function withElementDefinitions(
  nodes: Array<ElementDefinition>,
  spec: Spec,
): Spec {
  const nameToElement: Record<string, ElementDefinition> = {}
  for (const n of nodes) {
    nameToElement[n.contents.name] = n
  }
  return {
    _tag: 'Spec',
    contents: {
      ...spec.contents,
      elements: nodes,
      nameToElement,
    },
  }
}

export function markDefinition(
  name: string,
  spec: Spec,
): Option<MarkDefinition> {
  return fromNullable(spec.contents.nameToMark[name])
}

export function elementDefinition(
  name: string,
  spec: Spec,
): Option<ElementDefinition> {
  return fromNullable(spec.contents.nameToElement[name])
}
