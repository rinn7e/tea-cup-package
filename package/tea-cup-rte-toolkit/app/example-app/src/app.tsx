import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import {
  type AppRoute,
  examplesPage,
  homePage,
  toUrlString,
} from './common/type/route'
import { basicPageView } from './page/basic/component'
import { examplesPageView } from './page/examples/component'
import { homePageView } from './page/home/component'
import { markdownPageView } from './page/markdown/component'
import { specExtensionPageView } from './page/spec-extension/component'
import { specFromScratchPageView } from './page/spec-from-scratch/component'
import type { Model, Msg } from './type'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const appView = ({ model, dispatch }: Props): React.ReactElement => {
  const currentTag = model.route.page._tag

  const navigateTo = (route: AppRoute, e: React.MouseEvent) => {
    e.preventDefault()
    dispatch({ _tag: 'ChangeRoute', route })
  }

  return (
    <div className='app-container'>
      <header className='header'>
        <a
          href={toUrlString({ page: homePage() })}
          className='logo-section'
          onClick={(e) => navigateTo({ page: homePage() }, e)}
        >
          <img
            src='/logo.png'
            alt='Logo'
            className='logo-icon'
          />
          <span className='logo-text'>Tea Cup RTE</span>
        </a>
        <nav>
          <ul className='nav-links'>
            <li>
              <a
                href={toUrlString({ page: homePage() })}
                className={`nav-link ${currentTag === 'HomePage' ? 'active' : ''}`}
                onClick={(e) => navigateTo({ page: homePage() }, e)}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href={toUrlString({ page: examplesPage() })}
                className={`nav-link ${
                  currentTag !== 'HomePage' ? 'active' : ''
                }`}
                onClick={(e) => navigateTo({ page: examplesPage() }, e)}
              >
                Examples
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main className='main-content'>{renderPage(model, dispatch)}</main>

      <footer className='footer'>
        <p>
          💞 Devotedly built for Master using{' '}
          <a
            href='https://github.com/rinn7e/tea-cup-package'
            target='_blank'
            rel='noopener noreferrer'
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            Tea-Cup
          </a>{' '}
          • Inspired by elm-rte-toolkit 🌸
        </p>
      </footer>
    </div>
  )
}

const renderPage = (model: Model, dispatch: Dispatcher<Msg>) => {
  switch (model.pageModel._tag) {
    case 'HomePageModel':
      return homePageView({
        model: model.pageModel.model,
        dispatch: (msg) => dispatch({ _tag: 'HomePageMsg', subMsg: msg }),
      })
    case 'ExamplesPageModel':
      return examplesPageView({ setGlobalMsg: dispatch })
    case 'BasicPageModel':
      return basicPageView({
        model: model.pageModel.model,
        dispatch: (msg) => dispatch({ _tag: 'BasicPageMsg', subMsg: msg }),
        setGlobalMsg: dispatch,
      })
    case 'MarkdownPageModel':
      return markdownPageView({
        model: model.pageModel.model,
        dispatch: (msg) => dispatch({ _tag: 'MarkdownPageMsg', subMsg: msg }),
        setGlobalMsg: dispatch,
      })
    case 'SpecExtensionPageModel':
      return specExtensionPageView({
        model: model.pageModel.model,
        dispatch: (msg) =>
          dispatch({ _tag: 'SpecExtensionPageMsg', subMsg: msg }),
        setGlobalMsg: dispatch,
      })
    case 'SpecFromScratchPageModel':
      return specFromScratchPageView({
        model: model.pageModel.model,
        dispatch: (msg) =>
          dispatch({ _tag: 'SpecFromScratchPageMsg', subMsg: msg }),
        setGlobalMsg: dispatch,
      })
  }
}
