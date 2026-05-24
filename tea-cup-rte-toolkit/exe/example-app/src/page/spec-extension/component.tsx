import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { examplesPage } from '@/common/type/route'
import { editorComponentView } from '@/component/editor/component'
import { linkView } from '@/component/link'
import type { Msg as GlobalMsg } from '@/type'

import type { Model, Msg } from './type'
import { customDecorations, customSpec } from './update'

interface Props {
  model: Model
  dispatch: Dispatcher<Msg>
  setGlobalMsg: Dispatcher<GlobalMsg>
}

export const specExtensionPageView = ({
  model,
  dispatch,
  setGlobalMsg,
}: Props): React.ReactElement => {
  const modal = model.insertCaptionedImageModal

  return (
    <div>
      {linkView({
        route: { page: examplesPage() },
        className: 'back-link',
        setGlobalMsg,
        children: '← Back to Examples',
      })}

      <h1 className='page-title'>Extending a Specification 🚀</h1>
      <p className='page-description'>
        This example shows how you can extend a specification. Namely, we add
        two extra marks for <u>underline</u> and <s>strikethrough</s>, and we
        add a new block leaf element to display a captioned image with an
        interactive caption input box inside.
      </p>

      {/* Insert Captioned Image Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type='button'
          className='home-cta-btn'
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.9rem',
            boxShadow: 'none',
          }}
          onClick={() => dispatch({ _tag: 'ShowUpdateCaptionedImageModel' })}
        >
          🖼️ Insert Captioned Image
        </button>
      </div>

      {editorComponentView({
        model: model.editor,
        spec: customSpec,
        decorations: customDecorations,
        dispatch: (msg) => dispatch({ _tag: 'EditorMsg', subMsg: msg }),
      })}

      {/* INSERT CAPTIONED IMAGE MODAL */}
      {modal.visible && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <h3 className='modal-title'>Insert Captioned Image 🖼️</h3>
            <div className='modal-form-group'>
              <label className='modal-label'>Image Source URL</label>
              <input
                type='text'
                className='modal-input'
                value={modal.src}
                onChange={(e) =>
                  dispatch({
                    _tag: 'UpdateCaptionedImageSrc',
                    src: e.target.value,
                  })
                }
                placeholder='logo.svg'
                autoFocus
              />
            </div>
            <div className='modal-form-group'>
              <label className='modal-label'>Alt Description</label>
              <input
                type='text'
                className='modal-input'
                value={modal.alt}
                onChange={(e) =>
                  dispatch({
                    _tag: 'UpdateCaptionedImageAlt',
                    alt: e.target.value,
                  })
                }
                placeholder='Alternative text description'
              />
            </div>
            <div className='modal-form-group'>
              <label className='modal-label'>Caption Text</label>
              <input
                type='text'
                className='modal-input'
                value={modal.caption}
                onChange={(e) =>
                  dispatch({ _tag: 'UpdateCaption', caption: e.target.value })
                }
                placeholder='The caption goes here...'
              />
            </div>
            <div className='modal-actions'>
              <button
                type='button'
                className='modal-btn modal-btn-cancel'
                onClick={() => dispatch({ _tag: 'CancelInsertCaptionedImage' })}
              >
                Cancel
              </button>
              <button
                type='button'
                className='modal-btn modal-btn-confirm'
                onClick={() => dispatch({ _tag: 'InsertCaptionedImage' })}
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
