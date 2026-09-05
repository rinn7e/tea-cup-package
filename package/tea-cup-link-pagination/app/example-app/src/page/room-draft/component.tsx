import { ArrowLeft, Clock, FileText, Plus, Send, Trash2 } from 'lucide-react'
import { type JSX, memo, useContext } from 'react'

import { SetGlobalMsgContext } from '../../common/global-context'
import { navigateToRoom } from '../../common/util/route'
import { type Props } from './type'

export const RoomDraftPageComponent = ({
  model,
  room,
  dispatch,
}: Props): JSX.Element => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)
  const roomName = room ? room.name : model.roomId

  return (
    <div
      data-testid='room-draft-page'
      data-component='RoomDraftPageComponent'
      className='flex size-full flex-col bg-slate-50 select-none'
    >
      {/* 1. Header Bar */}
      <div className='flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            data-testid='drafts-back-btn'
            onClick={() => navigateToRoom(setGlobalMsg, model.roomId)}
            className='flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
            title='Back to Chat'
          >
            <ArrowLeft className='size-4' />
          </button>

          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm font-bold text-slate-800'>
                #{roomName} Drafts
              </h2>
              <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700'>
                {model.drafts.length} saved
              </span>
            </div>
            <p className='text-xs text-slate-500'>
              Unsent messages and notes for this room
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className='chat-scrollbar flex-1 overflow-y-auto p-6'>
        <div className='mx-auto max-w-3xl space-y-6'>
          {/* New Draft Card */}
          <div className='rounded-xl border border-slate-200 bg-white p-4 shadow-xs'>
            <h3 className='mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase'>
              Create New Draft
            </h3>
            <textarea
              data-testid='new-draft-textarea'
              rows={3}
              value={model.draftContent}
              onChange={(e) =>
                dispatch({
                  _tag: 'UpdateDraftContent',
                  text: e.target.value,
                })
              }
              placeholder='Write something to save as draft...'
              className='w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none'
            />
            <div className='mt-2 flex justify-end'>
              <button
                type='button'
                data-testid='save-draft-btn'
                onClick={() => dispatch({ _tag: 'SaveDraft' })}
                disabled={!model.draftContent.trim()}
                className='inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                <Plus className='size-3.5' />
                <span>Save Draft</span>
              </button>
            </div>
          </div>

          {/* Saved Drafts List */}
          <div className='space-y-3'>
            <h3 className='text-xs font-bold tracking-wider text-slate-500 uppercase'>
              Saved Drafts ({model.drafts.length})
            </h3>

            {model.drafts.length === 0 ? (
              <div
                data-testid='empty-drafts-notice'
                className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center'
              >
                <div className='mb-2 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
                  <FileText className='size-5' />
                </div>
                <p className='text-sm font-semibold text-slate-700'>
                  No saved drafts
                </p>
                <p className='text-xs text-slate-500'>
                  Draft messages for #{roomName} will appear here.
                </p>
              </div>
            ) : (
              model.drafts.map((draft) => (
                <div
                  key={draft.id}
                  data-testid={`draft-item-${draft.id}`}
                  className='group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md'
                >
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='flex items-center gap-1.5 text-xs text-slate-400'>
                      <Clock className='size-3.5' />
                      <span>
                        Last edited{' '}
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        }).format(new Date(draft.updatedAt))}
                      </span>
                    </div>

                    <div className='flex items-center gap-1 opacity-90 group-hover:opacity-100'>
                      <button
                        type='button'
                        data-testid={`delete-draft-${draft.id}`}
                        onClick={() =>
                          dispatch({
                            _tag: 'DeleteDraft',
                            draftId: draft.id,
                          })
                        }
                        className='flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                        title='Delete draft'
                      >
                        <Trash2 className='size-3.5' />
                        <span>Delete</span>
                      </button>

                      <button
                        type='button'
                        data-testid={`send-draft-${draft.id}`}
                        onClick={() =>
                          dispatch({
                            _tag: 'SendDraft',
                            draftId: draft.id,
                          })
                        }
                        className='flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100'
                        title='Send to room'
                      >
                        <Send className='size-3.5' />
                        <span>Send Now</span>
                      </button>
                    </div>
                  </div>

                  <p className='text-sm whitespace-pre-wrap text-slate-800'>
                    {draft.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const RoomDraftPage = memo(RoomDraftPageComponent)
