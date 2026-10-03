/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import * as O from 'fp-ts/lib/Option'
import { type ReactElement, memo } from 'react'

import { type Props, getPropsEq } from './type'
import { containerDomId, panelDomId, panels } from './util'
import { MeasuredPanel, containerStyle, panelStyle } from './view'

export const ScreenStackComponent = <Item, Parent>(
  props: Props<Item, Parent>,
) => {
  const { model, dispatch, renderScreen, parent, className } = props
  const transition = model.transition
  return (
    <div
      id={containerDomId(model.config.id)}
      data-screen-stack=''
      data-state={transition._tag}
      data-phase={transition._tag === 'Idle' ? undefined : transition.phase}
      className={className}
      style={containerStyle(model)}
    >
      {/* Ordered by depth and keyed by it, so the screen that stays keeps
          its DOM and state */}
      {panels(model).map((panel) => (
        <MeasuredPanel
          key={panel.depth}
          id={panelDomId(model.config.id, panel.depth)}
          index={panel.depth}
          role={panel.role}
          knownHeight={O.toUndefined(panel.entry.height)}
          onHeight={(height) =>
            dispatch({ _tag: 'HeightMeasured', depth: panel.depth, height })
          }
          // Only the incoming screen's own transform ends the transition,
          // not a transition bubbling up from inside the screen
          onTransitionEnd={
            panel.role === 'Top'
              ? (e) => {
                  if (
                    e.target === e.currentTarget &&
                    e.propertyName === 'transform'
                  ) {
                    dispatch({ _tag: 'TransitionEnd' })
                  } else {
                    // A transition of the content
                  }
                }
              : undefined
          }
          style={panelStyle(model, panel.role)}
        >
          {renderScreen(panel.entry.screen, panel.depth, parent)}
        </MeasuredPanel>
      ))}
    </div>
  )
}

// Re-renders only when the model (`itemEq`) or `parent` (`parentEq`) change.
// Sound because `renderScreen` receives everything it renders from as
// arguments.
export const ScreenStackMemo = memo(ScreenStackComponent, (prev, next) =>
  getPropsEq(prev.itemEq, prev.parentEq).equals(prev, next),
) as <Item, Parent>(props: Props<Item, Parent>) => ReactElement | null
