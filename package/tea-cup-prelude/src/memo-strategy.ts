import {
  type ComponentProps,
  type ComponentType,
  type MemoExoticComponent,
  memo,
} from 'react'

export const memoStrategy = <T extends ComponentType<any>>(
  Component: T,
  equals?: (
    prevProps: Readonly<ComponentProps<T>>,
    nextProps: Readonly<ComponentProps<T>>,
  ) => boolean,
): MemoExoticComponent<T> => {
  return memo(Component, equals) as unknown as MemoExoticComponent<T>
}
