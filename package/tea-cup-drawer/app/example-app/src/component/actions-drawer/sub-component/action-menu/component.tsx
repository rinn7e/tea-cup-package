import { type Dispatcher } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

const rowClassName =
  'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100'

// Not memoized: rendered inside `DrawerMemo`, which already skips renders
// when neither the menu model nor the parent state changed.
export const ActionMenu = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  switch (model.page) {
    case 'Main':
      return (
        <div data-test='action-menu-main' className='flex flex-col'>
          <p
            data-test='menu-message'
            className='px-3 pb-1 text-xs text-slate-500'
          >
            Message {model.messageId}
          </p>
          <button
            type='button'
            data-test='action-move-to'
            className={rowClassName}
            onClick={() => dispatch({ _tag: 'GoTo', page: 'MoveTo' })}
          >
            Move to…
          </button>
        </div>
      )
    case 'MoveTo': {
      const matches =
        model.folders._tag === 'Loaded'
          ? model.folders.folders.filter((folder) =>
              folder.toLowerCase().includes(model.query.toLowerCase()),
            )
          : []
      return (
        <div data-test='action-menu-move-to' className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              data-test='action-back'
              className='rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'
              onClick={() => dispatch({ _tag: 'GoTo', page: 'Main' })}
            >
              ← Back
            </button>
            <input
              data-test='folder-search'
              value={model.query}
              placeholder='Search folders'
              onChange={(e) =>
                dispatch({ _tag: 'SetQuery', query: e.target.value })
              }
              className='flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
            />
          </div>
          {model.folders._tag === 'Loaded' ? null : (
            <p data-test='folders-loading' className='px-3 py-2 text-sm'>
              Loading folders…
            </p>
          )}
          {matches.map((folder) => (
            <button
              key={folder}
              type='button'
              data-test={`folder-${folder}`}
              className={rowClassName}
              onClick={() => dispatch({ _tag: 'Pick', folder })}
            >
              {folder}
            </button>
          ))}
        </div>
      )
    }
  }
}
