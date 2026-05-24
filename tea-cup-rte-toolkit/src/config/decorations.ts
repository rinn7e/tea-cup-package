import { some } from 'fp-ts/lib/Option';
import { ElementDefinition } from './element-definition';
import { MarkDefinition } from './mark-definition';
import { selection } from '../internal/constants';
import { Message, Tagger } from '../internal/message';
import { Element, annotations } from '../model/element';
import { Mark } from '../model/mark';
import { Path } from '../model/node';
import { caret } from '../model/selection';

export type Attribute<Msg> = [string, string | (() => Msg)];

export const Attributes = {
  class: (className: string): Attribute<never> => ['className', className],
};

export const Events = {
  onClick: <Msg>(msg: Msg): Attribute<Msg> => ['onClick', () => msg],
};

export type ElementDecoration<Msg> = (
  editorNodePath: Path,
  element: Element,
  relativeHtmlNodePath: Path,
) => Array<Attribute<Msg>>;

export type MarkDecoration<Msg> = (
  editorNodePath: Path,
  mark: Mark,
  relativeHtmlNodePath: Path,
) => Array<Attribute<Msg>>;

export interface DecorationsContents<Msg> {
  readonly marks: Map<string, Array<MarkDecoration<Msg>>>;
  readonly elements: Map<string, Array<ElementDecoration<Msg>>>;
  readonly topLevelAttributes: Array<Attribute<Msg>>;
}

export type Decorations<Msg> = { readonly _tag: 'Decorations'; readonly contents: DecorationsContents<Msg> };

export function emptyDecorations<Msg>(): Decorations<Msg> {
  return {
    _tag: 'Decorations',
    contents: {
      marks: new Map(),
      elements: new Map(),
      topLevelAttributes: [],
    },
  };
}

export function markDecorations<Msg>(d: Decorations<Msg>): Map<string, Array<MarkDecoration<Msg>>> {
  return d.contents.marks;
}

export function elementDecorations<Msg>(d: Decorations<Msg>): Map<string, Array<ElementDecoration<Msg>>> {
  return d.contents.elements;
}

export function topLevelAttributes<Msg>(d: Decorations<Msg>): Array<Attribute<Msg>> {
  return d.contents.topLevelAttributes;
}

export function withMarkDecorations<Msg>(
  marks: Map<string, Array<MarkDecoration<Msg>>>,
  d: Decorations<Msg>,
): Decorations<Msg> {
  return {
    _tag: 'Decorations',
    contents: {
      ...d.contents,
      marks,
    },
  };
}

export function withElementDecorations<Msg>(
  elements: Map<string, Array<ElementDecoration<Msg>>>,
  d: Decorations<Msg>,
): Decorations<Msg> {
  return {
    _tag: 'Decorations',
    contents: {
      ...d.contents,
      elements,
    },
  };
}

export function withTopLevelAttributes<Msg>(
  topLevelAttributes_: Array<Attribute<Msg>>,
  d: Decorations<Msg>,
): Decorations<Msg> {
  return {
    _tag: 'Decorations',
    contents: {
      ...d.contents,
      topLevelAttributes: topLevelAttributes_,
    },
  };
}

export function addElementDecoration<Msg>(
  definition: ElementDefinition,
  decorator: ElementDecoration<Msg>,
  decorations: Decorations<Msg>,
): Decorations<Msg> {
  const eleDecorators = new Map(elementDecorations(decorations));
  const nameStr = definition.contents.name;
  const previousDecorations = eleDecorators.get(nameStr) || [];
  eleDecorators.set(nameStr, [decorator, ...previousDecorations]);
  return withElementDecorations(eleDecorators, decorations);
}

export function addMarkDecoration<Msg>(
  definition: MarkDefinition,
  decorator: MarkDecoration<Msg>,
  decorations: Decorations<Msg>,
): Decorations<Msg> {
  const mDecorators = new Map(markDecorations(decorations));
  const nameStr = definition.contents.name;
  const previousDecorations = mDecorators.get(nameStr) || [];
  mDecorators.set(nameStr, [decorator, ...previousDecorations]);
  return withMarkDecorations(mDecorators, decorations);
}

export function selectableDecoration<Msg>(
  tagger: Tagger<Msg>,
  editorNodePath: Path,
  elementParameters: Element,
  _: Path,
): Array<Attribute<Msg>> {
  const classes = annotations(elementParameters).has(selection) ? [Attributes.class('rte-selected')] : [];
  return [
    ...classes,
    Events.onClick(
      tagger({
        _tag: 'SelectionEvent',
        selection: some(caret(editorNodePath, 0)),
        force: false,
      }),
    ),
  ];
}
