import { markdown } from '@rinn7e/tea-cup-rte-toolkit'
import { marked } from 'marked'
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { examplesPage } from '@/common/type/route'
import { Link } from '@/component/link'
import { EditorComponent } from '@/editor/component'

import type { Model, Msg } from './type'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const MarkdownPage: React.FC<Props> = ({ model, dispatch }) => {
  const isWysiwyg = model.editorType === 'WYSIWYG'

  // Pre-compile preview HTML safely
  let previewHtml = ''
  if (!isWysiwyg) {
    try {
      previewHtml = marked.parse(model.textMarkdown) as string
    } catch {
      previewHtml = '<p>Error generating preview</p>'
    }
  }

  return (
    <div>
      <Link route={{ page: examplesPage() }} className='back-link'>
        ← Back to Examples
      </Link>

      <h1 className='page-title'>Markdown Example 📝</h1>
      <p className='page-description'>
        This example demonstrates switching between a plain Markdown source
        editor and a WYSIWYG editor. It converts the editor state to Markdown
        using <code>turndown</code> and parses Markdown back to the editor state
        using <code>marked</code>.
      </p>

      {/* Editor Selector Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
        }}
      >
        <label
          className='radio-label'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <input
            type='radio'
            name='editorType'
            checked={isWysiwyg}
            onChange={() =>
              dispatch({ _tag: 'EditorChange', editorType: 'WYSIWYG' })
            }
            style={{
              width: '18px',
              height: '18px',
              accentColor: 'var(--accent)',
            }}
          />
          WYSIWYG Editor
        </label>
        <label
          className='radio-label'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <input
            type='radio'
            name='editorType'
            checked={!isWysiwyg}
            onChange={() =>
              dispatch({ _tag: 'EditorChange', editorType: 'Markdown' })
            }
            style={{
              width: '18px',
              height: '18px',
              accentColor: 'var(--accent)',
            }}
          />
          Raw Markdown Text
        </label>
      </div>

      {/* Error Alert */}
      {model.markdownError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: 'var(--danger)',
            fontSize: '0.95rem',
          }}
        >
          <strong>⚠️ Parser Error:</strong> {model.markdownError}
        </div>
      )}

      {/* Render WYSIWYG Editor */}
      {isWysiwyg ? (
        <EditorComponent
          model={model.editor}
          spec={markdown}
          dispatch={(msg) => dispatch({ _tag: 'EditorMsg', subMsg: msg })}
        />
      ) : (
        /* Render side-by-side Markdown source and live HTML preview */
        <div className='markdown-split-layout'>
          <div className='markdown-panel'>
            <div className='markdown-panel-title'>Markdown Editor ✍️</div>
            <textarea
              className='markdown-textarea'
              value={model.textMarkdown}
              onChange={(e) =>
                dispatch({ _tag: 'TextAreaChange', text: e.target.value })
              }
              placeholder='Type your markdown here...'
            />
          </div>
          <div className='markdown-panel'>
            <div className='markdown-panel-title'>Live Preview 👁️</div>
            <div
              className='markdown-preview-html editor-body'
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export const MarkdownPageMemo = React.memo(MarkdownPage)
