import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

export type HomePage = {
  readonly _tag: 'HomePage'
}

export type ExamplesPage = {
  readonly _tag: 'ExamplesPage'
}

export type BasicPage = {
  readonly _tag: 'BasicPage'
}

export type MarkdownPage = {
  readonly _tag: 'MarkdownPage'
}

export type SpecExtensionPage = {
  readonly _tag: 'SpecExtensionPage'
}

export type SpecFromScratchPage = {
  readonly _tag: 'SpecFromScratchPage'
}

export type AppPage =
  | HomePage
  | ExamplesPage
  | BasicPage
  | MarkdownPage
  | SpecExtensionPage
  | SpecFromScratchPage

export const HomePageEq: EqClass.Eq<HomePage> = EqClass.struct({
  _tag: S.Eq,
})

export const ExamplesPageEq: EqClass.Eq<ExamplesPage> = EqClass.struct({
  _tag: S.Eq,
})

export const BasicPageEq: EqClass.Eq<BasicPage> = EqClass.struct({
  _tag: S.Eq,
})

export const MarkdownPageEq: EqClass.Eq<MarkdownPage> = EqClass.struct({
  _tag: S.Eq,
})

export const SpecExtensionPageEq: EqClass.Eq<SpecExtensionPage> =
  EqClass.struct({
    _tag: S.Eq,
  })

export const SpecFromScratchPageEq: EqClass.Eq<SpecFromScratchPage> =
  EqClass.struct({
    _tag: S.Eq,
  })

export const AppPageEq: EqClass.Eq<AppPage> = {
  equals: (x, y) => {
    if (x._tag === 'HomePage' && y._tag === 'HomePage') {
      return HomePageEq.equals(x, y)
    } else if (x._tag === 'ExamplesPage' && y._tag === 'ExamplesPage') {
      return ExamplesPageEq.equals(x, y)
    } else if (x._tag === 'BasicPage' && y._tag === 'BasicPage') {
      return BasicPageEq.equals(x, y)
    } else if (x._tag === 'MarkdownPage' && y._tag === 'MarkdownPage') {
      return MarkdownPageEq.equals(x, y)
    } else if (
      x._tag === 'SpecExtensionPage' &&
      y._tag === 'SpecExtensionPage'
    ) {
      return SpecExtensionPageEq.equals(x, y)
    } else if (
      x._tag === 'SpecFromScratchPage' &&
      y._tag === 'SpecFromScratchPage'
    ) {
      return SpecFromScratchPageEq.equals(x, y)
    } else {
      return false
    }
  },
}

export type AppRoute = {
  page: AppPage
}

export const AppRouteEq: EqClass.Eq<AppRoute> = EqClass.struct({
  page: AppPageEq,
})

export const defaultAppRoute = (): AppRoute => ({
  page: homePage(),
})

export const homePage = (): AppPage => ({ _tag: 'HomePage' })
export const examplesPage = (): AppPage => ({ _tag: 'ExamplesPage' })
export const basicPage = (): AppPage => ({ _tag: 'BasicPage' })
export const markdownPage = (): AppPage => ({ _tag: 'MarkdownPage' })
export const specExtensionPage = (): AppPage => ({ _tag: 'SpecExtensionPage' })
export const specFromScratchPage = (): AppPage => ({
  _tag: 'SpecFromScratchPage',
})
