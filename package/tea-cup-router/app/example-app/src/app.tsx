import * as TeaRouter from '@rinn7e/tea-cup-router'
import { Link } from '@rinn7e/tea-cup-router/link/component'
import * as O from 'fp-ts/lib/Option'
import React from 'react'
import type { Dispatcher } from 'tea-cup-fp'

import { type AppRoute, toUrl } from '@/common/route'
import * as ArticlePage from '@/page/article/component'
import * as EditorPage from '@/page/editor/component'
import * as HomePage from '@/page/home/component'
import * as LoginPage from '@/page/login/component'
import * as NotFoundPage from '@/page/not-found/component'
import * as ProfilePage from '@/page/profile/component'
import * as SettingsPage from '@/page/settings/component'
import * as SignupPage from '@/page/signup/component'

import { type Model, type Msg, TeaRouterMsg } from './type'

type Props = {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const App = ({ model, dispatch }: Props) => {
  const currentRoute = TeaRouter.getRoute(model.router)
  const pageModel = TeaRouter.getPageModel(model.router)
  const userOpt = model.shared.user
  const isLoggedIn = O.isSome(userOpt)

  const routerDispatch = (routerMsg: TeaRouter.Msg<AppRoute>) =>
    dispatch(TeaRouterMsg(routerMsg))

  return (
    <div className='max-w-4xl mx-auto p-6 font-sans space-y-6'>
      {/* Header & Navbar */}
      <header className='bg-white rounded-xl shadow-sm border border-slate-200 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent'>
              TeaCup Router Demo
            </span>
          </div>

          <nav className='flex flex-wrap items-center gap-3 text-sm'>
            <Link
              data-testid='nav-home'
              route={{ _tag: 'HomePage', tab: 'global', page: 1 }}
              toUrl={toUrl}
              dispatch={routerDispatch}
              className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-700'
            >
              Home
            </Link>
            <Link
              data-testid='nav-home-force-refresh'
              route={{ _tag: 'HomePage', tab: 'global', page: 1 }}
              forceRefresh={true}
              toUrl={toUrl}
              dispatch={routerDispatch}
              className='px-3 py-1.5 rounded-md hover:bg-rose-50 font-medium text-rose-600'
            >
              Home (Force Refresh)
            </Link>

            {!isLoggedIn ? (
              <>
                <Link
                  route={{ _tag: 'LoginPage' }}
                  toUrl={toUrl}
                  dispatch={routerDispatch}
                  className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-700'
                >
                  Sign In
                </Link>
                <Link
                  route={{ _tag: 'SignupPage' }}
                  toUrl={toUrl}
                  dispatch={routerDispatch}
                  className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-700'
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link
                  route={{ _tag: 'EditorPage' }}
                  toUrl={toUrl}
                  dispatch={routerDispatch}
                  className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-700'
                >
                  New Article
                </Link>
                <Link
                  route={{ _tag: 'SettingsPage' }}
                  toUrl={toUrl}
                  dispatch={routerDispatch}
                  className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-700'
                >
                  Settings
                </Link>
                <Link
                  route={{
                    _tag: 'ProfilePage',
                    username: userOpt.value.username,
                    favorites: false,
                  }}
                  toUrl={toUrl}
                  dispatch={routerDispatch}
                  className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-700'
                >
                  Profile (@{userOpt.value.username})
                </Link>
              </>
            )}

            <Link
              route={{ _tag: 'NotFoundPage' }}
              toUrl={toUrl}
              dispatch={routerDispatch}
              className='px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium text-slate-400'
            >
              404 Page
            </Link>
          </nav>

          <div className='flex items-center gap-2'>
            {isLoggedIn ? (
              <button
                type='button'
                data-testid='btn-logout-toggle'
                onClick={() => dispatch({ _tag: 'SetUser', user: O.none })}
                className='px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
              >
                Logout
              </button>
            ) : (
              <button
                type='button'
                data-testid='btn-login-toggle'
                onClick={() =>
                  dispatch({
                    _tag: 'SetUser',
                    user: O.some({ username: 'alice', token: 'token-123' }),
                  })
                }
                className='px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
              >
                Quick Login (as Alice)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* State Inspector Card */}
      <section className='bg-slate-900 text-slate-100 rounded-xl p-4 shadow-sm font-mono text-xs space-y-2'>
        <div className='flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1'>
          <span>ROUTER STATE INSPECTOR</span>
          <span
            data-testid='auth-status'
            className={isLoggedIn ? 'text-emerald-400' : 'text-amber-400'}
          >
            {isLoggedIn
              ? `Authenticated: ${userOpt.value.username}`
              : 'Unauthenticated (Guest)'}
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 pt-1'>
          <div>
            <span className='text-slate-400'>Current URL: </span>
            <span
              data-testid='current-url'
              className='text-teal-300 font-semibold'
            >
              {toUrl(currentRoute)}
            </span>
          </div>

          <div>
            <span className='text-slate-400'>Active Route Tag: </span>
            <span
              data-testid='route-tag'
              className='text-indigo-300 font-semibold'
            >
              {currentRoute._tag}
            </span>
          </div>
        </div>

        <div className='pt-1'>
          <span className='text-slate-400'>Page Model State: </span>
          <pre
            data-testid='page-state'
            className='bg-slate-950 p-2 rounded text-emerald-300 overflow-x-auto mt-1'
          >
            {JSON.stringify(pageModel, null, 2)}
          </pre>
        </div>
      </section>

      {/* Main Page Render View */}
      <main className='bg-white rounded-xl shadow-sm border border-slate-200 p-6'>
        {renderPageView(model, dispatch)}
      </main>
    </div>
  )
}

const renderPageView = (model: Model, dispatch: Dispatcher<Msg>) => {
  const pageModel = TeaRouter.getPageModel(model.router)

  switch (pageModel._tag) {
    case 'HomePageModel':
      return (
        <HomePage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'HomePageMsg', subMsg })}
        />
      )

    case 'LoginPageModel':
      return (
        <LoginPage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'LoginPageMsg', subMsg })}
        />
      )

    case 'SignupPageModel':
      return (
        <SignupPage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'SignupPageMsg', subMsg })}
        />
      )

    case 'SettingsPageModel':
      return (
        <SettingsPage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'SettingsPageMsg', subMsg })}
        />
      )

    case 'ProfilePageModel':
      return (
        <ProfilePage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'ProfilePageMsg', subMsg })}
        />
      )

    case 'ArticlePageModel':
      return (
        <ArticlePage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'ArticlePageMsg', subMsg })}
        />
      )

    case 'EditorPageModel':
      return (
        <EditorPage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'EditorPageMsg', subMsg })}
        />
      )

    case 'NotFoundPageModel':
      return (
        <NotFoundPage.view
          model={pageModel.model}
          shared={model.shared}
          dispatch={(subMsg) => dispatch({ _tag: 'NotFoundPageMsg', subMsg })}
        />
      )
  }
}
