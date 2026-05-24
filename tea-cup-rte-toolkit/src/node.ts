import { Either, left, right } from 'fp-ts/lib/Either';
import { Option, none, some, fromNullable } from 'fp-ts/lib/Option';
import { Block, Inline, Path, block, blockChildren, childNodes, inlineChildren, parent, toBlockArray, toInlineArray, withChildNodes } from './model/node';
import { Selection, anchorNode, anchorOffset, isCollapsed } from './model/selection';
import { Mark, MarkOrder, ToggleAction, toggle } from './model/mark';
import * as Text from './model/text';

export type Node =
  | { readonly _tag: 'Block'; readonly value: Block }
  | { readonly _tag: 'Inline'; readonly value: Inline };

export type Fragment =
  | { readonly _tag: 'BlockFragment'; readonly blockFragment: Array<Block> }
  | { readonly _tag: 'InlineFragment'; readonly inlineFragment: Array<Inline> };

/**
 * Returns the last path and node in the block.
 */
export function last(node: Block): [Path, Node] {
  const c = childNodes(node);
  if (c._tag === 'BlockChildren') {
    const arr = toBlockArray(c.blockChildren.array);
    const lastIndex = arr.length - 1;
    if (lastIndex >= 0) {
      const [p, n] = last(arr[lastIndex]);
      return [[lastIndex, ...p], n];
    }
  } else if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    const lastIndex = arr.length - 1;
    if (lastIndex >= 0) {
      return [[lastIndex], { _tag: 'Inline', value: arr[lastIndex] }];
    }
  }
  return [[], { _tag: 'Block', value: node }];
}

export type Iterator = (path: Path, node: Block) => Option<[Path, Node]>;

/**
 * Returns the previous path and node, if one exists, relative to the given path.
 */
export function previous(path: Path, node: Block): Option<[Path, Node]> {
  if (path.length === 0) {
    return none;
  }
  if (path.length === 1) {
    const x = path[0];
    const prevIndex = x - 1;
    const c = childNodes(node);
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array);
      if (prevIndex >= 0 && prevIndex < arr.length) {
        const [p, n] = last(arr[prevIndex]);
        return some([[prevIndex, ...p], n]);
      }
      return some([[], { _tag: 'Block', value: node }]);
    } else if (c._tag === 'InlineChildren') {
      const arr = toInlineArray(c.inlineChildren.contents.array);
      if (prevIndex >= 0 && prevIndex < arr.length) {
        return some([[prevIndex], { _tag: 'Inline', value: arr[prevIndex] }]);
      }
      return some([[], { _tag: 'Block', value: node }]);
    }
    return some([[], { _tag: 'Block', value: node }]);
  } else {
    const x = path[0];
    const xs = path.slice(1);
    const c = childNodes(node);
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array);
      const b = arr[x];
      if (b) {
        const prevOpt = previous(xs, b);
        if (prevOpt._tag === 'None') {
          return some([[x], { _tag: 'Block', value: b }]);
        } else {
          return some([[x, ...prevOpt.value[0]], prevOpt.value[1]]);
        }
      }
    } else if (c._tag === 'InlineChildren') {
      const arr = toInlineArray(c.inlineChildren.contents.array);
      const l = arr[x - 1];
      if (l) {
        return some([[x - 1], { _tag: 'Inline', value: l }]);
      }
      return some([[], { _tag: 'Block', value: node }]);
    }
  }
  return none;
}

/**
 * Returns the next path and node, if one exists, relative to the given path.
 */
export function next(path: Path, node: Block): Option<[Path, Node]> {
  if (path.length === 0) {
    const c = childNodes(node);
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array);
      if (arr.length > 0) {
        return some([[0], { _tag: 'Block', value: arr[0] }]);
      }
    } else if (c._tag === 'InlineChildren') {
      const arr = toInlineArray(c.inlineChildren.contents.array);
      if (arr.length > 0) {
        return some([[0], { _tag: 'Inline', value: arr[0] }]);
      }
    }
    return none;
  } else {
    const x = path[0];
    const xs = path.slice(1);
    const c = childNodes(node);
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array);
      const b = arr[x];
      if (b) {
        const nextOpt = next(xs, b);
        if (nextOpt._tag === 'None') {
          const bNext = arr[x + 1];
          if (bNext) {
            return some([[x + 1], { _tag: 'Block', value: bNext }]);
          }
        } else {
          return some([[x, ...nextOpt.value[0]], nextOpt.value[1]]);
        }
      }
    } else if (c._tag === 'InlineChildren') {
      const arr = toInlineArray(c.inlineChildren.contents.array);
      const b = arr[x + 1];
      if (b) {
        return some([[x + 1], { _tag: 'Inline', value: b }]);
      }
    }
  }
  return none;
}

function findNodeFrom(
  iter: Iterator,
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): Option<[Path, Node]> {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: node });
  if (nodeOpt._tag === 'Some') {
    if (pred(path, nodeOpt.value)) {
      return some([path, nodeOpt.value]);
    }
  }
  return findNodeFromExclusive(iter, pred, path, node);
}

function findNodeFromExclusive(
  iter: Iterator,
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): Option<[Path, Node]> {
  const nextPathOpt = iter(path, node);
  if (nextPathOpt._tag === 'None') {
    return none;
  }
  return findNodeFrom(iter, pred, nextPathOpt.value[0], node);
}

export function findForwardFrom(
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): Option<[Path, Node]> {
  return findNodeFrom(next, pred, path, node);
}

export function findForwardFromExclusive(
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): Option<[Path, Node]> {
  return findNodeFromExclusive(next, pred, path, node);
}

export function findBackwardFrom(
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): Option<[Path, Node]> {
  return findNodeFrom(previous, pred, path, node);
}

export function findBackwardFromExclusive(
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): Option<[Path, Node]> {
  return findNodeFromExclusive(previous, pred, path, node);
}

/**
 * Map a given function onto a block's children recursively and flatten the resulting list.
 */
export function concatMap(func: (node: Node) => Array<Node>, node: Block): Block {
  const c = childNodes(node);
  let newChildren = c;
  if (c._tag === 'BlockChildren') {
    const list: Array<Block> = [];
    const blockList = toBlockArray(c.blockChildren.array);
    for (const b of blockList) {
      const mapped = func({ _tag: 'Block', value: b });
      for (const m of mapped) {
        if (m._tag === 'Block') {
          list.push(m.value);
        }
      }
    }
    newChildren = blockChildren(list.map((subNode) => concatMap(func, subNode)));
  } else if (c._tag === 'InlineChildren') {
    const list: Array<Inline> = [];
    const inlineList = toInlineArray(c.inlineChildren.contents.array);
    for (const inlineNode of inlineList) {
      const mapped = func({ _tag: 'Inline', value: inlineNode });
      for (const m of mapped) {
        if (m._tag === 'Inline') {
          list.push(m.value);
        }
      }
    }
    newChildren = inlineChildren(list);
  }
  return withChildNodes(newChildren, node);
}

/**
 * Apply a function to this node and all child nodes.
 */
export function map(func: (node: Node) => Node, node: Node): Node {
  const applied = func(node);
  if (applied._tag === 'Block') {
    const blockNode = applied.value;
    const c = childNodes(blockNode);
    let cn = c;
    if (c._tag === 'BlockChildren') {
      const mapped = toBlockArray(c.blockChildren.array).map((v) => {
        const res = map(func, { _tag: 'Block', value: v });
        return res._tag === 'Block' ? res.value : v;
      });
      cn = blockChildren(mapped);
    } else if (c._tag === 'InlineChildren') {
      const mapped = toInlineArray(c.inlineChildren.contents.array).map((v) => {
        const res = map(func, { _tag: 'Inline', value: v });
        return res._tag === 'Inline' ? res.value : v;
      });
      cn = inlineChildren(mapped);
    }
    return {
      _tag: 'Block',
      value: withChildNodes(cn, blockNode),
    };
  }
  return applied;
}

export function indexedMap(func: (path: Path, node: Node) => Node, node: Node): Node {
  return indexedMapRec([], func, node);
}

function indexedMapRec(path: Path, func: (path: Path, node: Node) => Node, node: Node): Node {
  const applied = func(path, node);
  if (applied._tag === 'Block') {
    const blockNode = applied.value;
    const c = childNodes(blockNode);
    let cn = c;
    if (c._tag === 'BlockChildren') {
      const mapped = toBlockArray(c.blockChildren.array).map((v, i) => {
        const res = indexedMapRec([...path, i], func, { _tag: 'Block', value: v });
        return res._tag === 'Block' ? res.value : v;
      });
      cn = blockChildren(mapped);
    } else if (c._tag === 'InlineChildren') {
      const mapped = toInlineArray(c.inlineChildren.contents.array).map((v, i) => {
        const res = indexedMapRec([...path, i], func, { _tag: 'Inline', value: v });
        return res._tag === 'Inline' ? res.value : v;
      });
      cn = inlineChildren(mapped);
    }
    return {
      _tag: 'Block',
      value: withChildNodes(cn, blockNode),
    };
  }
  return applied;
}

export function foldl<B>(func: (node: Node, acc: B) => B, acc: B, node: Node): B {
  if (node._tag === 'Block') {
    const blockNode = node.value;
    const c = childNodes(blockNode);
    let children: Array<Node> = [];
    if (c._tag === 'InlineChildren') {
      children = toInlineArray(c.inlineChildren.contents.array).map((v) => ({ _tag: 'Inline' as const, value: v }));
    } else if (c._tag === 'BlockChildren') {
      children = toBlockArray(c.blockChildren.array).map((v) => ({ _tag: 'Block' as const, value: v }));
    }
    let res = func(node, acc);
    for (const child of children) {
      res = foldl(func, res, child);
    }
    return res;
  }
  return func(node, acc);
}

export function foldr<B>(func: (node: Node, acc: B) => B, acc: B, node: Node): B {
  let innerAcc = acc;
  if (node._tag === 'Block') {
    const blockNode = node.value;
    const c = childNodes(blockNode);
    let children: Array<Node> = [];
    if (c._tag === 'InlineChildren') {
      children = toInlineArray(c.inlineChildren.contents.array).map((v) => ({ _tag: 'Inline' as const, value: v }));
    } else if (c._tag === 'BlockChildren') {
      children = toBlockArray(c.blockChildren.array).map((v) => ({ _tag: 'Block' as const, value: v }));
    }
    for (let i = children.length - 1; i >= 0; i--) {
      innerAcc = foldr(func, innerAcc, children[i]);
    }
  }
  return func(node, innerAcc);
}

export function indexedFoldl<B>(func: (path: Path, node: Node, acc: B) => B, acc: B, node: Node): B {
  return indexedFoldlRec([], func, acc, node);
}

function indexedFoldlRec<B>(path: Path, func: (path: Path, node: Node, acc: B) => B, acc: B, node: Node): B {
  if (node._tag === 'Block') {
    const blockNode = node.value;
    const c = childNodes(blockNode);
    let children: Array<Node> = [];
    if (c._tag === 'InlineChildren') {
      children = toInlineArray(c.inlineChildren.contents.array).map((v) => ({ _tag: 'Inline' as const, value: v }));
    } else if (c._tag === 'BlockChildren') {
      children = toBlockArray(c.blockChildren.array).map((v) => ({ _tag: 'Block' as const, value: v }));
    }
    let res = func(path, node, acc);
    for (let i = 0; i < children.length; i++) {
      res = indexedFoldlRec([...path, i], func, res, children[i]);
    }
    return res;
  }
  return func(path, node, acc);
}

export function indexedFoldr<B>(func: (path: Path, node: Node, acc: B) => B, acc: B, node: Node): B {
  return indexedFoldrRec([], func, acc, node);
}

function indexedFoldrRec<B>(path: Path, func: (path: Path, node: Node, acc: B) => B, acc: B, node: Node): B {
  let innerAcc = acc;
  if (node._tag === 'Block') {
    const blockNode = node.value;
    const c = childNodes(blockNode);
    let children: Array<Node> = [];
    if (c._tag === 'InlineChildren') {
      children = toInlineArray(c.inlineChildren.contents.array).map((v) => ({ _tag: 'Inline' as const, value: v }));
    } else if (c._tag === 'BlockChildren') {
      children = toBlockArray(c.blockChildren.array).map((v) => ({ _tag: 'Block' as const, value: v }));
    }
    for (let i = children.length - 1; i >= 0; i--) {
      innerAcc = indexedFoldrRec([...path, i], func, innerAcc, children[i]);
    }
  }
  return func(path, node, innerAcc);
}

function comparePaths(a: Path, b: Path): 'LT' | 'EQ' | 'GT' {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] < b[i]) {
      return 'LT';
    } else if (a[i] > b[i]) {
      return 'GT';
    }
  }
  if (a.length < b.length) {
    return 'LT';
  } else if (a.length > b.length) {
    return 'GT';
  }
  return 'EQ';
}

export function foldlRange<B>(
  start: Path | null,
  end: Path | null,
  func: (path: Path, node: Node, acc: B) => B,
  acc: B,
  root: Node,
): B {
  return indexedFoldl(
    (path, node, innerAcc) => {
      if (start && comparePaths(path, start) === 'LT') {
        return innerAcc;
      }
      if (end && comparePaths(path, end) === 'GT') {
        return innerAcc;
      }
      return func(path, node, innerAcc);
    },
    acc,
    root,
  );
}

export function foldrRange<B>(
  start: Path | null,
  end: Path | null,
  func: (path: Path, node: Node, acc: B) => B,
  acc: B,
  root: Node,
): B {
  return indexedFoldr(
    (path, node, innerAcc) => {
      if (start && comparePaths(path, start) === 'LT') {
        return innerAcc;
      }
      if (end && comparePaths(path, end) === 'GT') {
        return innerAcc;
      }
      return func(path, node, innerAcc);
    },
    acc,
    root,
  );
}

/**
 * Returns the node at the given path in the root block.
 */
export function nodeAt(path: Path, root: Node): Option<Node> {
  if (path.length === 0) {
    return some(root);
  }
  if (root._tag === 'Block') {
    const c = childNodes(root.value);
    const x = path[0];
    const xs = path.slice(1);
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array);
      const child = arr[x];
      if (child) {
        return nodeAt(xs, { _tag: 'Block', value: child });
      }
    } else if (c._tag === 'InlineChildren') {
      const arr = toInlineArray(c.inlineChildren.contents.array);
      const child = arr[x];
      if (child && xs.length === 0) {
        return some({ _tag: 'Inline', value: child });
      }
    }
  }
  return none;
}

/**
 * Replaces the node at the given path with the new node.
 */
export function replace(path: Path, newNode: Node, root: Block): Either<string, Block> {
  if (path.length === 0) {
    if (newNode._tag === 'Block') {
      return right(newNode.value);
    }
    return left('Cannot replace root block with inline node');
  }
  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(root);
  if (c._tag === 'BlockChildren') {
    const arr = [...toBlockArray(c.blockChildren.array)];
    const child = arr[x];
    if (!child) {
      return left('Invalid path ' + path.join(':'));
    }
    if (xs.length === 0) {
      if (newNode._tag === 'Block') {
        arr[x] = newNode.value;
        return right(withChildNodes(blockChildren(arr), root));
      }
      return left('Cannot replace block child with inline node');
    } else {
      const res = replace(xs, newNode, child);
      if (res._tag === 'Left') return res;
      arr[x] = res.right;
      return right(withChildNodes(blockChildren(arr), root));
    }
  } else if (c._tag === 'InlineChildren') {
    const arr = [...toInlineArray(c.inlineChildren.contents.array)];
    const child = arr[x];
    if (!child) {
      return left('Invalid path ' + path.join(':'));
    }
    if (xs.length === 0 && newNode._tag === 'Inline') {
      arr[x] = newNode.value;
      return right(withChildNodes(inlineChildren(arr), root));
    }
  }
  return left('Invalid path traversal ' + path.join(':'));
}

/**
 * Replaces the node at the given path with a fragment of nodes.
 */
export function replaceWithFragment(path: Path, frag: Fragment, root: Block): Either<string, Block> {
  if (path.length === 0) {
    return left('Cannot replace root node with fragment');
  }
  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(root);
  if (c._tag === 'BlockChildren') {
    const arr = toBlockArray(c.blockChildren.array);
    const child = arr[x];
    if (!child) {
      return left('Invalid path');
    }
    if (xs.length === 0) {
      if (frag._tag === 'BlockFragment') {
        const newArr = [
          ...arr.slice(0, x),
          ...frag.blockFragment,
          ...arr.slice(x + 1),
        ];
        return right(withChildNodes(blockChildren(newArr), root));
      }
      return left('Expected block fragment');
    } else {
      const res = replaceWithFragment(xs, frag, child);
      if (res._tag === 'Left') return res;
      const newArr = [...arr];
      newArr[x] = res.right;
      return right(withChildNodes(blockChildren(newArr), root));
    }
  } else if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    const child = arr[x];
    if (!child) {
      return left('Invalid path');
    }
    if (xs.length === 0) {
      if (frag._tag === 'InlineFragment') {
        const newArr = [
          ...arr.slice(0, x),
          ...frag.inlineFragment,
          ...arr.slice(x + 1),
        ];
        return right(withChildNodes(inlineChildren(newArr), root));
      }
      return left('Expected inline fragment');
    }
  }
  return left('Invalid path');
}

/**
 * Inserts the fragment after the specified path.
 */
export function insertAfter(path: Path, frag: Fragment, root: Block): Either<string, Block> {
  if (path.length === 0) {
    return left('Cannot insert after root');
  }
  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(root);
  if (c._tag === 'BlockChildren') {
    const arr = toBlockArray(c.blockChildren.array);
    const child = arr[x];
    if (!child) {
      return left('Invalid path');
    }
    if (xs.length === 0) {
      if (frag._tag === 'BlockFragment') {
        const newArr = [
          ...arr.slice(0, x + 1),
          ...frag.blockFragment,
          ...arr.slice(x + 1),
        ];
        return right(withChildNodes(blockChildren(newArr), root));
      }
      return left('Expected block fragment');
    } else {
      const res = insertAfter(xs, frag, child);
      if (res._tag === 'Left') return res;
      const newArr = [...arr];
      newArr[x] = res.right;
      return right(withChildNodes(blockChildren(newArr), root));
    }
  } else if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    const child = arr[x];
    if (!child) {
      return left('Invalid path');
    }
    if (xs.length === 0) {
      if (frag._tag === 'InlineFragment') {
        const newArr = [
          ...arr.slice(0, x + 1),
          ...frag.inlineFragment,
          ...arr.slice(x + 1),
        ];
        return right(withChildNodes(inlineChildren(newArr), root));
      }
      return left('Expected inline fragment');
    }
  }
  return left('Invalid path');
}

export function insertBefore(path: Path, frag: Fragment, root: Block): Either<string, Block> {
  if (path.length === 0) {
    return left('Cannot insert before root');
  }
  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(root);
  if (c._tag === 'BlockChildren') {
    const arr = toBlockArray(c.blockChildren.array);
    const child = arr[x];
    if (!child) {
      return left('Invalid path');
    }
    if (xs.length === 0) {
      if (frag._tag === 'BlockFragment') {
        const newArr = [
          ...arr.slice(0, x),
          ...frag.blockFragment,
          ...arr.slice(x),
        ];
        return right(withChildNodes(blockChildren(newArr), root));
      }
      return left('Expected block fragment');
    } else {
      const res = insertBefore(xs, frag, child);
      if (res._tag === 'Left') return res;
      const newArr = [...arr];
      newArr[x] = res.right;
      return right(withChildNodes(blockChildren(newArr), root));
    }
  } else if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    const child = arr[x];
    if (!child) {
      return left('Invalid path');
    }
    if (xs.length === 0) {
      if (frag._tag === 'InlineFragment') {
        const newArr = [
          ...arr.slice(0, x),
          ...frag.inlineFragment,
          ...arr.slice(x),
        ];
        return right(withChildNodes(inlineChildren(newArr), root));
      }
      return left('Expected inline fragment');
    }
  }
  return left('Invalid path');
}

export function removeNodeAndEmptyParents(path: Path, root: Block): Block {
  if (path.length === 0) {
    return root;
  }
  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(root);
  if (c._tag === 'BlockChildren') {
    const arr = toBlockArray(c.blockChildren.array);
    const child = arr[x];
    if (!child) {
      return root;
    }
    if (xs.length === 0) {
      const newArr = [...arr.slice(0, x), ...arr.slice(x + 1)];
      if (newArr.length === 0) {
        return root; // don't make parents empty yet
      }
      return withChildNodes(blockChildren(newArr), root);
    } else {
      const childRes = removeNodeAndEmptyParents(xs, child);
      const newArr = [...arr];
      const childNodesC = childNodes(childRes);
      const isEmpty =
        childNodesC._tag === 'BlockChildren'
          ? childNodesC.blockChildren.array.length === 0
          : childNodesC._tag === 'InlineChildren'
          ? childNodesC.inlineChildren.contents.array.length === 0
          : false;
      if (isEmpty) {
        newArr.splice(x, 1);
      } else {
        newArr[x] = childRes;
      }
      return withChildNodes(blockChildren(newArr), root);
    }
  } else if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    if (xs.length === 0) {
      const newArr = [...arr.slice(0, x), ...arr.slice(x + 1)];
      return withChildNodes(inlineChildren(newArr), root);
    }
  }
  return root;
}

export function removeInRange(start: Path, end: Path, root: Block): Block {
  const startStr = start.join(':');
  const endStr = end.join(':');
  const res = indexedMap((path, node) => {
    const pathStr = path.join(':');
    if (comparePaths(path, start) === 'GT' && comparePaths(path, end) === 'LT') {
      // Return empty node
      if (node._tag === 'Block') {
        return { _tag: 'Block', value: withChildNodes(blockChildren([]), node.value) };
      } else {
        const il = node.value;
        if (il._tag === 'Text') {
          return { _tag: 'Inline', value: { _tag: 'Text', text: Text.withText('', il.text) } };
        }
      }
    }
    return node;
  }, { _tag: 'Block', value: root });

  return res._tag === 'Block' ? res.value : root;
}

export function isEmptyTextBlock(node: Block): boolean {
  const c = childNodes(node);
  if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    if (arr.length === 0) return true;
    if (arr.length === 1 && arr[0]._tag === 'Text' && arr[0].text.contents.text.length === 0) {
      return true;
    }
  }
  return false;
}

export function selectionIsBeginningOfTextBlock(sel: Selection, root: Block): boolean {
  if (anchorOffset(sel) !== 0) return false;
  const path = anchorNode(sel);
  if (path.length <= 1) return true;
  for (let i = 1; i < path.length; i++) {
    if (path[i] !== 0) return false;
  }
  return true;
}

export function selectionIsEndOfTextBlock(sel: Selection, root: Block): boolean {
  const path = anchorNode(sel);
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: root });
  if (nodeOpt._tag === 'None') return false;
  const nodeVal = nodeOpt.value;
  let len = 0;
  if (nodeVal._tag === 'Inline' && nodeVal.value._tag === 'Text') {
    len = nodeVal.value.text.contents.text.length;
  }
  if (anchorOffset(sel) !== len) return false;
  let currentPath = path;
  while (currentPath.length > 1) {
    const idx = currentPath[currentPath.length - 1];
    const parentPath = currentPath.slice(0, -1);
    const pOpt = nodeAt(parentPath, { _tag: 'Block', value: root });
    if (pOpt._tag === 'None' || pOpt.value._tag !== 'Block') return false;
    const c = childNodes(pOpt.value.value);
    let arrLen = 0;
    if (c._tag === 'InlineChildren') {
      arrLen = toInlineArray(c.inlineChildren.contents.array).length;
    } else if (c._tag === 'BlockChildren') {
      arrLen = toBlockArray(c.blockChildren.array).length;
    }
    if (idx !== arrLen - 1) return false;
    currentPath = parentPath;
  }
  return true;
}

export function splitTextLeaf(offset: number, textNode: Text.Text): [Text.Text, Text.Text] {
  const t = textNode.contents.text;
  const t1 = t.substring(0, offset);
  const t2 = t.substring(offset);
  return [Text.withText(t1, textNode), Text.withText(t2, textNode)];
}

export function joinBlocks(b1: Block, b2: Block): Option<Block> {
  const c1 = childNodes(b1);
  const c2 = childNodes(b2);
  if (c1._tag === 'InlineChildren' && c2._tag === 'InlineChildren') {
    const arr1 = toInlineArray(c1.inlineChildren.contents.array);
    const arr2 = toInlineArray(c2.inlineChildren.contents.array);
    return some(withChildNodes(inlineChildren([...arr1, ...arr2]), b1));
  }
  return none;
}

export function findAncestor(
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  root: Block,
): Option<[Path, Node]> {
  let curr = path;
  while (curr.length > 0) {
    const nodeOpt = nodeAt(curr, { _tag: 'Block', value: root });
    if (nodeOpt._tag === 'Some') {
      if (pred(curr, nodeOpt.value)) {
        return some([curr, nodeOpt.value]);
      }
    }
    curr = parent(curr);
  }
  return none;
}

export function findTextBlockNodeAncestor(path: Path, root: Block): Option<[Path, Block]> {
  const res = findAncestor(
    (p, node) => node._tag === 'Block' && childNodes(node.value)._tag === 'InlineChildren',
    path,
    root,
  );
  if (res._tag === 'Some') {
    const [p, node] = res.value;
    if (node._tag === 'Block') {
      return some([p, node.value]);
    }
  }
  return none;
}

export function findClosestBlockPath(path: Path, root: Block): Path {
  const res = findAncestor((p, node) => node._tag === 'Block', path, root);
  if (res._tag === 'Some') {
    return res.value[0];
  }
  return [];
}

export function splitBlockAtPathAndOffset(path: Path, offset: number, node: Block): Option<[Block, Block]> {
  if (path.length === 0) {
    const c = childNodes(node);
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array);
      return some([
        withChildNodes(blockChildren(arr.slice(0, offset)), node),
        withChildNodes(blockChildren(arr.slice(offset)), node),
      ]);
    } else if (c._tag === 'InlineChildren') {
      const arr = toInlineArray(c.inlineChildren.contents.array);
      return some([
        withChildNodes(inlineChildren(arr.slice(0, offset)), node),
        withChildNodes(inlineChildren(arr.slice(offset)), node),
      ]);
    } else {
      return some([node, node]);
    }
  }

  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(node);
  if (c._tag === 'BlockChildren') {
    const arr = toBlockArray(c.blockChildren.array);
    if (x < 0 || x >= arr.length) {
      return none;
    }
    const n = arr[x];
    const splitRes = splitBlockAtPathAndOffset(xs, offset, n);
    if (splitRes._tag === 'None') {
      return none;
    }
    const [before, after] = splitRes.value;
    const beforeArr = [...arr.slice(0, x), before];
    const afterArr = [after, ...arr.slice(x + 1)];
    return some([
      withChildNodes(blockChildren(beforeArr), node),
      withChildNodes(blockChildren(afterArr), node),
    ]);
  } else if (c._tag === 'InlineChildren') {
    const arr = toInlineArray(c.inlineChildren.contents.array);
    if (x < 0 || x >= arr.length) {
      return none;
    }
    const n = arr[x];
    if (n._tag === 'Text') {
      const [before, after] = splitTextLeaf(offset, n.text);
      const beforeArr = [...arr.slice(0, x), { _tag: 'Text' as const, text: before }];
      const afterArr = [{ _tag: 'Text' as const, text: after }, ...arr.slice(x + 1)];
      return some([
        withChildNodes(inlineChildren(beforeArr), node),
        withChildNodes(inlineChildren(afterArr), node),
      ]);
    } else {
      return some([
        withChildNodes(inlineChildren(arr.slice(0, x)), node),
        withChildNodes(inlineChildren(arr.slice(x)), node),
      ]);
    }
  } else {
    return none;
  }
}

export function toggleMark(
  order: MarkOrder,
  markVal: Mark,
  action: ToggleAction,
  path: Path,
  root: Block,
): Either<string, Block> {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: root });
  if (nodeOpt._tag === 'None' || nodeOpt.value._tag !== 'Inline') {
    return left('Node not found');
  }

  const il = nodeOpt.value.value;
  if (il._tag !== 'Text') {
    return left('Can only toggle mark on text node');
  }

  const newMarks = toggle(action, order, markVal, Text.marks(il.text));
  const newText = Text.withMarks(newMarks, il.text);
  return replace(path, { _tag: 'Inline', value: { _tag: 'Text', text: newText } }, root);
}

export function allRange(
  pred: (node: Node) => boolean,
  start: Path,
  end: Path,
  root: Block,
): boolean {
  if (comparePaths(start, end) === 'GT') {
    return true;
  }

  const nodeOpt = nodeAt(start, { _tag: 'Block', value: root });
  if (nodeOpt._tag === 'None') {
    return true;
  }

  const node = nodeOpt.value;
  if (pred(node)) {
    const nextOpt = next(start, root);
    if (nextOpt._tag === 'None') {
      return true;
    }
    const [nextPath] = nextOpt.value;
    return allRange(pred, nextPath, end, root);
  } else {
    return false;
  }
}

export function anyRange(
  pred: (node: Node) => boolean,
  start: Path,
  end: Path,
  root: Block,
): boolean {
  return !allRange((x) => !pred(x), start, end, root);
}

