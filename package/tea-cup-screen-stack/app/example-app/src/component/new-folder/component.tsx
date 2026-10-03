import { type Dispatcher } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const NewFolder = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => (
  <form
    className='flex flex-col gap-2'
    onSubmit={(e) => {
      e.preventDefault()
      dispatch({ _tag: 'Create' })
    }}
  >
    <input
      data-test='new-folder-name'
      value={model.name}
      placeholder='Folder name'
      onChange={(e) => dispatch({ _tag: 'SetName', name: e.target.value })}
      className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
    />
    <button
      type='submit'
      data-test='create-folder'
      disabled={model.name.trim() === ''}
      className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40'
    >
      Create
    </button>
  </form>
)
