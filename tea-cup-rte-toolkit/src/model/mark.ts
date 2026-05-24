import { Spec, markDefinitions } from '../config/spec'
import * as Internal from '../internal/definitions'

export type Mark = Internal.Mark

export const mark = Internal.mark
export const name = Internal.nameFromMark
export const attributes = Internal.attributesFromMark
export const withAttributes = Internal.markWithAttributes

export type MarkOrder = {
  readonly _tag: 'MarkOrder'
  readonly contents: Record<string, number>
}

export function markOrderFromSpec(spec: Spec): MarkOrder {
  const order: Record<string, number> = {}
  markDefinitions(spec).forEach((m, i) => {
    order[m.contents.name] = i
  })
  return { _tag: 'MarkOrder', contents: order }
}

export function sort(order: MarkOrder, marks: Array<Mark>): Array<Mark> {
  const o = order.contents
  return [...marks].sort((a, b) => {
    const aName = name(a)
    const bName = name(b)
    const aVal = o[aName] !== undefined ? o[aName] : -1
    const bVal = o[bName] !== undefined ? o[bName] : -1
    if (aVal !== bVal) {
      return aVal - bVal
    }
    return aName.localeCompare(bName)
  })
}

export type ToggleAction =
  | { readonly _tag: 'Add' }
  | { readonly _tag: 'Remove' }
  | { readonly _tag: 'Flip' }

export const Add: ToggleAction = { _tag: 'Add' }
export const Remove: ToggleAction = { _tag: 'Remove' }
export const Flip: ToggleAction = { _tag: 'Flip' }

export function toggle(
  toggleAction: ToggleAction,
  order: MarkOrder,
  mark_: Mark,
  marks: Array<Mark>,
): Array<Mark> {
  const isMember = marks.some((m) => name(m) === name(mark_))
  if (
    toggleAction._tag === 'Remove' ||
    (toggleAction._tag === 'Flip' && isMember)
  ) {
    return marks.filter((x) => name(x) !== name(mark_))
  } else if (!isMember) {
    return sort(order, [mark_, ...marks])
  } else {
    return marks.map((x) => {
      if (name(x) === name(mark_)) {
        return mark_
      }
      return x
    })
  }
}

export function hasMarkWithName(name_: string, marks: Array<Mark>): boolean {
  return marks.some((m) => name(m) === name_)
}
