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
import { type ReactElement, memo } from 'react'

import { type Props, getPropsEq } from './type'
import { type PanelRole, containerDomId, depth, panelDomId } from './util'
import { MeasuredPanel, containerStyle, panelStyle } from './view'

type Panel<Item> = { index: number; screen: Item; role: PanelRole }

// The screens to render, ordered by depth: the top one, plus the outgoing
// one while sliding. Keyed by depth, so the screen that stays (the new
// `from` on a push) keeps its DOM and state.
const panelsOf = <Item, Parent>(props: Props<Item, Parent>): Panel<Item>[] => {
  const model = props.model
  const transition = model.transition
  const top: Panel<Item> = {
    index: depth(model),
    screen: model.stack[depth(model)],
    role: 'Top',
  }
  switch (transition._tag) {
    case 'Idle':
      return [top]
    case 'Sliding':
      if (transition.direction === 'Forward') {
        return [
          {
            index: transition.fromDepth,
            screen: transition.from,
            role: 'From',
          },
          top,
        ]
      } else {
        return [
          top,
          {
            index: transition.fromDepth,
            screen: transition.from,
            role: 'From',
          },
        ]
      }
  }
}

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
      data-direction={
        transition._tag === 'Sliding' ? transition.direction : undefined
      }
      data-phase={transition._tag === 'Sliding' ? transition.phase : undefined}
      className={className}
      style={containerStyle(model)}
    >
      {panelsOf(props).map((panel) => (
        <MeasuredPanel
          key={panel.index}
          id={panelDomId(model.config.id, panel.index)}
          index={panel.index}
          role={panel.role}
          knownHeight={model.heights[String(panel.index)]}
          onHeight={(height) =>
            dispatch({ _tag: 'HeightMeasured', depth: panel.index, height })
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
          {renderScreen(panel.screen, panel.index, parent)}
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
