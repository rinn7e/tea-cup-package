import { type AppRoute } from './common/type/route'
import type * as Basic from './page/basic/type'
import type * as Examples from './page/examples/type'
import type * as Home from './page/home/type'
import type * as Markdown from './page/markdown/type'
import type * as SpecExtension from './page/spec-extension/type'
import type * as SpecFromScratch from './page/spec-from-scratch/type'

export type PageModel =
  | { _tag: 'HomePageModel'; model: Home.Model }
  | { _tag: 'ExamplesPageModel'; model: Examples.Model }
  | { _tag: 'BasicPageModel'; model: Basic.Model }
  | { _tag: 'MarkdownPageModel'; model: Markdown.Model }
  | { _tag: 'SpecExtensionPageModel'; model: SpecExtension.Model }
  | { _tag: 'SpecFromScratchPageModel'; model: SpecFromScratch.Model }

export type Model = {
  route: AppRoute
  pageModel: PageModel
  isInternal: boolean
}

export type Msg =
  | { _tag: 'UrlChange'; location: Location }
  | { _tag: 'ChangeRoute'; route: AppRoute }
  | { _tag: 'HomePageMsg'; subMsg: Home.Msg }
  | { _tag: 'ExamplesPageMsg'; subMsg: Examples.Msg }
  | { _tag: 'BasicPageMsg'; subMsg: Basic.Msg }
  | { _tag: 'MarkdownPageMsg'; subMsg: Markdown.Msg }
  | { _tag: 'SpecExtensionPageMsg'; subMsg: SpecExtension.Msg }
  | { _tag: 'SpecFromScratchPageMsg'; subMsg: SpecFromScratch.Msg }
