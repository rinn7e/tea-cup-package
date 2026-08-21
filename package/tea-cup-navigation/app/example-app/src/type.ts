import type * as Navigation from '@rinn7e/tea-cup-navigation'
import type { Option } from 'fp-ts/lib/Option'

import type { AppRoute } from '@/common/route'
import type { Shared, User } from '@/common/shared'
import type * as ArticlePage from '@/page/article/type'
import type * as EditorPage from '@/page/editor/type'
import type * as HomePage from '@/page/home/type'
import type * as LoginPage from '@/page/login/type'
import type * as NotFoundPage from '@/page/not-found/type'
import type * as ProfilePage from '@/page/profile/type'
import type * as SettingsPage from '@/page/settings/type'
import type * as SignupPage from '@/page/signup/type'

export type PageModel =
  | { readonly _tag: 'HomePageModel'; readonly model: HomePage.Model }
  | { readonly _tag: 'LoginPageModel'; readonly model: LoginPage.Model }
  | { readonly _tag: 'SignupPageModel'; readonly model: SignupPage.Model }
  | { readonly _tag: 'SettingsPageModel'; readonly model: SettingsPage.Model }
  | { readonly _tag: 'ProfilePageModel'; readonly model: ProfilePage.Model }
  | { readonly _tag: 'ArticlePageModel'; readonly model: ArticlePage.Model }
  | { readonly _tag: 'EditorPageModel'; readonly model: EditorPage.Model }
  | { readonly _tag: 'NotFoundPageModel'; readonly model: NotFoundPage.Model }

export type Model = {
  readonly navigation: Navigation.Model<AppRoute, PageModel>
  readonly shared: Shared
}

export type Msg =
  | { readonly _tag: 'NoOp' }
  | {
      readonly _tag: 'NavigationMsg'
      readonly subMsg: Navigation.Msg<AppRoute>
    }
  | { readonly _tag: 'SetUser'; readonly user: Option<User> }
  | { readonly _tag: 'HomePageMsg'; readonly subMsg: HomePage.Msg }
  | { readonly _tag: 'LoginPageMsg'; readonly subMsg: LoginPage.Msg }
  | { readonly _tag: 'SignupPageMsg'; readonly subMsg: SignupPage.Msg }
  | { readonly _tag: 'SettingsPageMsg'; readonly subMsg: SettingsPage.Msg }
  | { readonly _tag: 'ProfilePageMsg'; readonly subMsg: ProfilePage.Msg }
  | { readonly _tag: 'ArticlePageMsg'; readonly subMsg: ArticlePage.Msg }
  | { readonly _tag: 'EditorPageMsg'; readonly subMsg: EditorPage.Msg }
  | { readonly _tag: 'NotFoundPageMsg'; readonly subMsg: NotFoundPage.Msg }
