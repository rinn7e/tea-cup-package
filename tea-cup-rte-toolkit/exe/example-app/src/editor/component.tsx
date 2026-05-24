import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'
import { RteEditor, type Spec } from '@rinn7e/tea-cup-rte-toolkit'

import { createEditorConfig, deriveControlState } from './update'
import type { Model, Msg, Style } from './type'

interface Props {
  model: Model
  spec: Spec
  dispatch: Dispatcher<Msg>
  decorations?: any
}

// Inline SVGs for premium look
const BoldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
)

const ItalicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
)

const CodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const UnderlineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </svg>
)

const StrikeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M16 6C16 6 14.5 4 12 4C8 4 7 7 8 9C9 11 15 11 16 13C17 15 16 20 12 20C9.5 20 8 18 8 18" />
  </svg>
)

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const ListOlIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 6H4" />
    <path d="M4 16h2v2H4z" />
  </svg>
)

const ListUlIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="2" />
    <circle cx="4" cy="12" r="2" />
    <circle cx="4" cy="18" r="2" />
  </svg>
)

const QuoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const HrIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const OutdentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 8 3 12 7 16" />
    <line x1="21" y1="12" x2="11" y2="12" />
    <line x1="21" y1="6" x2="11" y2="6" />
    <line x1="21" y1="18" x2="11" y2="18" />
  </svg>
)

const HeadingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="4" x2="4" y2="20" />
    <line x1="20" y1="4" x2="20" y2="20" />
  </svg>
)

const CodeBlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
)

const RedoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </svg>
)

export const EditorComponent: React.FC<Props> = ({ model, spec, dispatch, decorations }) => {
  const cs = deriveControlState(model.editor)
  const config = createEditorConfig(spec, (m) => ({
    _tag: 'InternalMsg' as const,
    msg: m,
  }), decorations)

  const renderStyleButton = (style: Style, label: string, icon: React.ReactNode) => {
    const isStyleActive = cs.marks.has(style.toLowerCase())
    const isDisabled = !cs.hasInline || cs.nodes.has('code_block')
    
    return (
      <button
        type="button"
        className={`toolbar-btn ${isStyleActive ? 'active' : ''}`}
        disabled={isDisabled}
        title={label}
        onMouseDown={(e) => {
          e.preventDefault()
          if (!isDisabled) {
            dispatch({ _tag: 'ToggleStyle', style })
          }
        }}
      >
        {icon}
      </button>
    )
  }

  const renderBlockButton = (blockName: string, label: string, icon: React.ReactNode) => {
    const isCode = blockName === 'Code block'
    const blockKey = isCode ? 'code_block' : 'heading'
    const isBlockActive = cs.nodes.has(blockKey)

    return (
      <button
        type="button"
        className={`toolbar-btn ${isBlockActive ? 'active' : ''}`}
        disabled={!cs.hasInline}
        title={label}
        onMouseDown={(e) => {
          e.preventDefault()
          if (cs.hasInline) {
            dispatch({ _tag: 'ToggleBlock', block: blockName })
          }
        }}
      >
        {icon}
      </button>
    )
  }

  const linkStatus = !cs.hasInline ? 'Disabled' : cs.marks.has('link') ? 'Active' : 'Enabled'
  const imageStatus = !cs.hasInline ? 'Disabled' : 'Enabled'

  return (
    <div className="editor-layout">
      {/* TOOLBAR */}
      <div className="editor-toolbar">
        {/* Undo/Redo */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            disabled={!cs.hasUndo}
            title="Undo"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.hasUndo) dispatch({ _tag: 'Undo' })
            }}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={!cs.hasRedo}
            title="Redo"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.hasRedo) dispatch({ _tag: 'Redo' })
            }}
          >
            <RedoIcon />
          </button>
        </div>

        {/* Styles */}
        <div className="toolbar-group">
          {renderStyleButton('Bold', 'Bold', <BoldIcon />)}
          {renderStyleButton('Italic', 'Italic', <ItalicIcon />)}
          {renderStyleButton('Code', 'Code', <CodeIcon />)}
          {renderStyleButton('Underline', 'Underline', <UnderlineIcon />)}
          {renderStyleButton('Strikethrough', 'Strikethrough', <StrikeIcon />)}
        </div>

        {/* Links and Images */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${linkStatus === 'Active' ? 'active' : ''}`}
            disabled={linkStatus === 'Disabled'}
            title="Link"
            onMouseDown={(e) => {
              e.preventDefault()
              if (linkStatus !== 'Disabled') dispatch({ _tag: 'ShowInsertLinkModal' })
            }}
          >
            <LinkIcon />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={imageStatus === 'Disabled'}
            title="Insert Image"
            onMouseDown={(e) => {
              e.preventDefault()
              if (imageStatus !== 'Disabled') dispatch({ _tag: 'ShowInsertImageModal' })
            }}
          >
            <ImageIcon />
          </button>
        </div>

        {/* Lists & HR & Blockquote & Lift */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${cs.nodes.has('ordered_list') ? 'active' : ''}`}
            disabled={!cs.hasSelection}
            title="Ordered List"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.hasSelection) dispatch({ _tag: 'WrapInList', listType: 'Ordered' })
            }}
          >
            <ListOlIcon />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${cs.nodes.has('unordered_list') ? 'active' : ''}`}
            disabled={!cs.hasSelection}
            title="Unordered List"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.hasSelection) dispatch({ _tag: 'WrapInList', listType: 'Unordered' })
            }}
          >
            <ListUlIcon />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={!cs.hasSelection}
            title="Horizontal Rule"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.hasSelection) dispatch({ _tag: 'InsertHorizontalRule' })
            }}
          >
            <HrIcon />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${cs.nodes.has('blockquote') ? 'active' : ''}`}
            disabled={!cs.hasSelection}
            title="Blockquote"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.hasSelection) dispatch({ _tag: 'WrapInBlockQuote' })
            }}
          >
            <QuoteIcon />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={!cs.canLift}
            title="Lift out of block"
            onMouseDown={(e) => {
              e.preventDefault()
              if (cs.canLift) dispatch({ _tag: 'LiftOutOfBlock' })
            }}
          >
            <OutdentIcon />
          </button>
        </div>

        {/* Header and Codeblock */}
        <div className="toolbar-group">
          {renderBlockButton('H1', 'Heading 1', <HeadingIcon />)}
          {renderBlockButton('Code block', 'Code Block', <CodeBlockIcon />)}
        </div>
      </div>

      {/* EDITOR CONTENT */}
      <div className="web-component-editor-wrap">
        <RteEditor
          config={config}
          editor={model.editor}
          dispatch={dispatch}
        />
      </div>

      {/* INSERT LINK MODAL */}
      {model.insertLinkModal.visible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Insert Link 🔗</h3>
            <div className="modal-form-group">
              <label className="modal-label">URL (Href)</label>
              <input
                type="text"
                className="modal-input"
                value={model.insertLinkModal.href}
                onChange={(e) =>
                  dispatch({ _tag: 'UpdateLinkHref', href: e.target.value })
                }
                placeholder="https://example.com"
                autoFocus
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Title</label>
              <input
                type="text"
                className="modal-input"
                value={model.insertLinkModal.title}
                onChange={(e) =>
                  dispatch({ _tag: 'UpdateLinkTitle', title: e.target.value })
                }
                placeholder="Link tooltip description"
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={() => dispatch({ _tag: 'CancelInsertLink' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-confirm"
                onClick={() => dispatch({ _tag: 'InsertLink' })}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSERT IMAGE MODAL */}
      {model.insertImageModal.visible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Insert Image 🖼️</h3>
            <div className="modal-form-group">
              <label className="modal-label">Image Source URL</label>
              <input
                type="text"
                className="modal-input"
                value={model.insertImageModal.src}
                onChange={(e) =>
                  dispatch({ _tag: 'UpdateImageSrc', src: e.target.value })
                }
                placeholder="https://example.com/image.png"
                autoFocus
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Alt Description</label>
              <input
                type="text"
                className="modal-input"
                value={model.insertImageModal.alt}
                onChange={(e) =>
                  dispatch({ _tag: 'UpdateImageAlt', alt: e.target.value })
                }
                placeholder="Image description for accessibility"
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={() => dispatch({ _tag: 'CancelInsertImage' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-confirm"
                onClick={() => dispatch({ _tag: 'InsertImage' })}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
