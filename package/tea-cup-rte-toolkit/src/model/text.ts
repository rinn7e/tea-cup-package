import { Mark } from './mark'

export interface TextContents {
  readonly marks: Array<Mark>
  readonly annotations: Set<string>
  readonly text: string
}

export type Text = { readonly _tag: 'Text'; readonly contents: TextContents }

export const empty: Text = {
  _tag: 'Text',
  contents: {
    marks: [],
    annotations: new Set(),
    text: '',
  },
}

export function marks(parameters: Text): Array<Mark> {
  return parameters.contents.marks
}

export function annotations(parameters: Text): Set<string> {
  return parameters.contents.annotations
}

export function text(parameters: Text): string {
  return parameters.contents.text
}

export function withText(s: string, parameters: Text): Text {
  return {
    _tag: 'Text',
    contents: {
      ...parameters.contents,
      text: s,
    },
  }
}

export function withAnnotations(ann: Set<string>, parameters: Text): Text {
  return {
    _tag: 'Text',
    contents: {
      ...parameters.contents,
      annotations: ann,
    },
  }
}

export function withMarks(m: Array<Mark>, parameters: Text): Text {
  return {
    _tag: 'Text',
    contents: {
      ...parameters.contents,
      marks: m,
    },
  }
}
