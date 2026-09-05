import { filterUnique } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import type * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as Ord from 'fp-ts/lib/Ord'
import * as Set from 'fp-ts/lib/Set'
import { pipe } from 'fp-ts/lib/function'

import {
  type ContainerChangeEvent,
  type LogicConfig,
  type Mode,
  type Model,
} from './type'
import * as SUA from './type/sorted-unique-array'
import { type SortedUniqueArray } from './type/sorted-unique-array'

export const isAEqual =
  <A>(config: LogicConfig<A>) =>
  (a1: A, a2: A): boolean =>
    config.uniqueKeyField(a1) === config.uniqueKeyField(a2)

export const removeDup =
  <A>({
    ord,
    uniqueKeyField,
  }: {
    ord: Ord.Ord<A>
    uniqueKeyField: (a: A) => string
  }) =>
  (arr: A[]): A[] => {
    const dataEq: EqClass.Eq<A> = {
      equals: (first, second) =>
        uniqueKeyField(first) === uniqueKeyField(second),
    }
    return Set.toArray(ord)(Set.fromArray(dataEq)(arr))
  }

export const concatRemoveDup = <A>(
  config: LogicConfig<A>,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueIncomingData = filterUnique(
    isAEqual(config),
    incomingData,
    currentData,
  )
  return currentData.concat(uniqueIncomingData)
}

export const concatFrontRemoveDup = <A>(
  config: LogicConfig<A>,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueIncomingData = filterUnique(
    isAEqual(config),
    incomingData,
    currentData,
  )
  return uniqueIncomingData.concat(currentData)
}

export const concatFrontOverwriteDup = <A>(
  config: LogicConfig<A>,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueCurrentData = filterUnique(
    isAEqual(config),
    currentData,
    incomingData,
  )
  return incomingData.concat(uniqueCurrentData)
}

export const modeToArray = <A>(mode: Mode<A>): A[] => mode.overallData.value

export const removeElFromArray = <A>(
  config: LogicConfig<A>,
  currentData: A,
  incomingData: A[],
): A[] =>
  pipe(
    incomingData,
    A.filter((el) => !isAEqual(config)(currentData, el)),
  )

export const revertPrevIsMax = <A>(model: Model<A>): Model<A> => {
  if (model.mode.prevIsMax) {
    return {
      ...model,
      mode: {
        ...model.mode,
        prevIsMax: false,
      },
    }
  }
  return model
}

export const upsertWithPrevious = <A>(
  config: LogicConfig<A>,
  arr: SortedUniqueArray<A>,
  item: A,
  key: (a: A) => string,
  previousId: string | null,
  comparePrevId: (a: A, prevId: string) => boolean,
): SortedUniqueArray<A> => {
  if (previousId) {
    const idx = SUA.findIndex<A>((x) => comparePrevId(x, previousId))(arr)
    if (idx >= 0) {
      return SUA.updateAtOrKeep(idx, item)(arr)
    }
    return SUA.concat(config.eqWithKey, config.ord)([item])(arr)
  }
  const idx = SUA.findIndex<A>((x) => key(x) === key(item))(arr)
  return idx >= 0
    ? SUA.updateAtOrKeep(idx, item)(arr)
    : SUA.concat(config.eqWithKey, config.ord)([item])(arr)
}

export const getChangeEvent = <A>(
  prevArr: SortedUniqueArray<A>,
  data: A,
  ord: Ord.Ord<A>,
  isReversed: boolean,
): ContainerChangeEvent => {
  const latest = prevArr.value[0]
  if (!latest) return { _tag: 'NoChange' }

  const isNewer = Ord.gt(ord)(data, latest)

  if (isReversed) {
    // Chat mode: History (older) is Top, Newer is Bottom
    return isNewer
      ? { _tag: 'ElementModifyOnBottom' }
      : { _tag: 'ElementModifyOnTop' }
  }
  // Standard mode: Newer is Top, History (older) is Bottom
  return isNewer
    ? { _tag: 'ElementModifyOnTop' }
    : { _tag: 'ElementModifyOnBottom' }
}

export function addOrUpdateData<A>(
  config: LogicConfig<A>,
  data: A,
  previousId: string | null,
  comparePreviousId: (data: A, prevId: string) => boolean = () => false,
) {
  return (model: Model<A>): [Model<A>, ContainerChangeEvent] => {
    const overallData = upsertWithPrevious(
      config,
      model.mode.overallData,
      data,
      config.uniqueKeyField,
      previousId,
      comparePreviousId,
    )

    const event = getChangeEvent(
      model.mode.overallData,
      data,
      config.ord,
      config.isReversed,
    )

    return [
      {
        ...model,
        mode: { ...model.mode, overallData },
      },
      event,
    ]
  }
}

export const replaceFuncActionHandler = <A>(
  model: Model<A>,
  func: (as: SortedUniqueArray<A>) => SortedUniqueArray<A>,
): Model<A> => {
  const allData = model.mode.overallData
  const newAllData = func(allData)
  return {
    ...model,
    mode: {
      ...model.mode,
      overallData: newAllData,
    },
  }
}

export const getSelectedA = <A>(
  logicConfig: LogicConfig<A>,
  model: Model<A>,
): Option<A> => {
  const selectedI = model.mode.selectedKey
    ? model.mode.overallData.value.findIndex(
        (a) => logicConfig.uniqueKeyField(a) === model.mode.selectedKey,
      )
    : -1

  return selectedI >= 0
    ? O.some(model.mode.overallData.value[selectedI])
    : O.none
}

export const isInView = (
  element: HTMLElement,
  options: { margin?: number } = {},
): boolean => {
  const rect = element.getBoundingClientRect()
  const margin = options.margin ?? 0
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight
  const windowWidth = window.innerWidth || document.documentElement.clientWidth

  const vertInView =
    rect.top + margin <= windowHeight && rect.top + rect.height - margin >= 0
  const horInView =
    rect.left + margin <= windowWidth && rect.left + rect.width - margin >= 0

  return vertInView && horInView
}
