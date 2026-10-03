import { cn } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

// Not memoized: rendered inside `DrawerMemo`, which already skips renders
// when neither the drawer model nor the form (its `parent`) changed.
export const FeedbackForm = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => (
  <div className='flex flex-col gap-3'>
    <div className='flex gap-1'>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type='button'
          data-test={`rating-${rating}`}
          data-selected={model.rating === rating ? 'true' : 'false'}
          className={cn(
            'h-9 w-9 rounded-lg border text-sm font-bold transition',
            model.rating === rating
              ? 'border-amber-400 bg-amber-100 text-amber-700'
              : 'border-slate-300 text-slate-500 hover:bg-slate-100',
          )}
          onClick={() => dispatch({ _tag: 'SetRating', rating })}
        >
          {rating}
        </button>
      ))}
    </div>
    <textarea
      data-test='feedback-comment'
      value={model.comment}
      placeholder='What could be better?'
      onChange={(e) =>
        dispatch({ _tag: 'SetComment', comment: e.target.value })
      }
      className='rounded-lg border border-slate-300 px-3 py-2 text-sm'
    />
    <button
      type='button'
      data-test='feedback-submit'
      className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700'
      onClick={() => dispatch({ _tag: 'Submit' })}
    >
      Submit & close
    </button>
  </div>
)
