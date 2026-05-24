import {
  type MarkDefinition,
  defaultHtmlToMark,
  markDefinition,
} from '@rinn7e/tea-cup-rte-toolkit'

export const underline: MarkDefinition = markDefinition({
  name: 'underline',
  toHtmlNode: (m, children) => ({
    _tag: 'ElementNode',
    name: 'u',
    attributes: [],
    children,
  }),
  fromHtmlNode: defaultHtmlToMark('u'),
})

export const strikethrough: MarkDefinition = markDefinition({
  name: 'strikethrough',
  toHtmlNode: (m, children) => ({
    _tag: 'ElementNode',
    name: 's',
    attributes: [],
    children,
  }),
  fromHtmlNode: defaultHtmlToMark('s'),
})
