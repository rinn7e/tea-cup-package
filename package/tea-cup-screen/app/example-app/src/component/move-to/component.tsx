import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { type Dispatcher } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

const rowClassName =
  'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100'

// Not memoized: rendered inside the drawer's memo, which already skips
// renders when the screen stack did not change.
export const MoveTo = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => (
  <div className='flex flex-col gap-2'>
    <input
      data-test='folder-search'
      value={model.query}
      placeholder='Search folders'
      onChange={(e) => dispatch({ _tag: 'SetQuery', query: e.target.value })}
      className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
    />
    {pipe(
      model.folders,
      O.fold(
        () => (
          <p data-test='folders-loading' className='px-3 py-2.5 text-sm'>
            Loading folders…
          </p>
        ),
        (folders) => (
          <div data-test='folders' className='flex flex-col'>
            {folders
              .filter((folder) =>
                folder.toLowerCase().includes(model.query.toLowerCase()),
              )
              .map((folder) => (
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
        ),
      ),
    )}
    <button
      type='button'
      data-test='new-folder'
      className={`${rowClassName} text-sky-700`}
      onClick={() => dispatch({ _tag: 'NewFolder' })}
    >
      New folder…
    </button>
  </div>
)
