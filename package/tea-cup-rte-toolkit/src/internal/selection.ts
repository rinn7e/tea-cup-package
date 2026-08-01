import { Option, none, some } from 'fp-ts/lib/Option'

import { Spec } from '../config/spec'
import { Block, Path } from '../model/node'
import {
  Selection,
  anchorNode,
  anchorOffset,
  focusNode,
  focusOffset,
  range,
} from '../model/selection'
import * as PathMod from './path'

export function domToEditor(
  spec: Spec,
  root: Block,
  selection: Selection,
): Option<Selection> {
  return transformSelection(
    (r, p) => PathMod.domToEditor(spec, r, p),
    root,
    selection,
  )
}

export function editorToDom(
  spec: Spec,
  root: Block,
  selection: Selection,
): Option<Selection> {
  return transformSelection(
    (r, p) => PathMod.editorToDom(spec, r, p),
    root,
    selection,
  )
}

function transformSelection(
  transformation: (root: Block, path: Path) => Option<Path>,
  node: Block,
  selection: Selection,
): Option<Selection> {
  const anOpt = transformation(node, anchorNode(selection))
  if (anOpt._tag === 'None') {
    return none
  }
  const fnOpt = transformation(node, focusNode(selection))
  if (fnOpt._tag === 'None') {
    return none
  }
  return some(
    range(
      anOpt.value,
      anchorOffset(selection),
      fnOpt.value,
      focusOffset(selection),
    ),
  )
}
