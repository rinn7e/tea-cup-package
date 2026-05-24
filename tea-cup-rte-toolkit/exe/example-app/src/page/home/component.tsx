import { markdown } from '@rinn7e/tea-cup-rte-toolkit'
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { EditorComponent } from '@/editor/component'

import type { Model, Msg } from './type'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
}

const features = [
  {
    icon: '🌐',
    title: 'Cross-browser support',
    text: 'Instead of relying on inconsistent contenteditable APIs, the package depends on other web standards, like mutation observers, that are supported in all evergreen browsers on both desktop and mobile.',
  },
  {
    icon: '⚙️',
    title: 'Customizable specification',
    text: 'You can define a document with a custom structure, without having to code the rules from scratch.',
  },
  {
    icon: '⚡',
    title: '100% functional',
    text: 'All logic defining the editor is implemented in TypeScript and React. It treats contenteditable as a pure I/O device.',
  },
  {
    icon: '🍵',
    title: 'Fits into the Tea-Cup Architecture',
    text: 'This package follows the guidelines of the Tea-Cup architecture and fits seamlessly into your Model-View-Update application loop.',
  },
]

export const HomePage: React.FC<Props> = ({ model, dispatch }) => {
  return (
    <div>
      <div className='home-hero'>
        <h1 className='home-title'>
          Tea-Cup package for building rich text editors
        </h1>
        <p className='home-subtitle'>
          A robust, programmable rich text editor toolkit inspired by
          elm-rte-toolkit, faithfully ported to React and TypeScript.
        </p>
      </div>

      <EditorComponent
        model={model.editor}
        spec={markdown}
        dispatch={(msg) => dispatch({ _tag: 'EditorMsg', subMsg: msg })}
      />

      <h2
        className='page-title'
        style={{ marginTop: '4rem', textAlign: 'center' }}
      >
        Features 🚀
      </h2>
      <div className='features-grid'>
        {features.map((feature, idx) => (
          <div key={idx} className='feature-card'>
            <div className='feature-icon'>{feature.icon}</div>
            <h3 className='feature-title'>{feature.title}</h3>
            <p className='feature-desc'>{feature.text}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '4rem',
          padding: '2rem',
          borderTop: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          About 🌸
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Rich Text Editor Toolkit is an open source project that you are free
          to use commercially. The project is inspired by the wonderful work of
          the Elm community.
        </p>
        <p>
          Feel free to explore our examples directory to see the toolkit in
          action with standard, customized, and from-scratch spec models!
        </p>
      </div>
    </div>
  )
}

export const HomePageMemo = React.memo(HomePage)
