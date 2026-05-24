const zeroWidthSpace = '\u200B'

const isAndroid = (): boolean => {
  return /(android)/i.test(navigator.userAgent)
}

const getSelectionPath = (
  node: Node | null,
  editor: HTMLElement,
  offset: number,
): number[] | null => {
  if (!node) {
    return null
  }
  const originalNode = node

  const path: Node[] = []
  try {
    let curr: Node | null = node
    while (
      curr &&
      (curr instanceof HTMLElement ? curr.tagName : '') !== 'BODY'
    ) {
      path.push(curr)
      if (curr === editor) {
        break
      }
      curr = curr.parentNode
    }

    if (path[path.length - 1] !== editor) {
      return null
    }

    const indexPath: number[] = []
    for (let i = 0; i < path.length - 1; i += 1) {
      const child = path[i]
      const parent = path[i + 1]

      let index = 0
      for (const childNode of Array.from(parent.childNodes)) {
        if (childNode === child) {
          break
        }
        index += 1
      }
      indexPath.unshift(index)
    }

    if (originalNode.nodeType === Node.ELEMENT_NODE && offset > 0) {
      indexPath.push(offset - 1)
    } else if (
      originalNode.nodeType === Node.ELEMENT_NODE &&
      originalNode.childNodes[0]
    ) {
      indexPath.push(0)
    }

    if (indexPath.length <= 2) {
      return null
    }

    // Drop the first two nodes
    indexPath.shift()
    indexPath.shift()

    return indexPath.slice()
  } catch (e) {
    return null
  }
}

const findNodeFromPath = (
  path: number[] | string | null,
  editor: HTMLElement,
): Node | null => {
  if (!path) {
    return null
  }

  let finalPath: number[]
  if (typeof path === 'string') {
    finalPath = path.split(':').map((v) => Number(v))
  } else {
    finalPath = path
  }

  let node: Node | null = editor
  const newPath = [0, 0, ...finalPath]
  while (newPath.length && node) {
    const index = newPath.shift()
    if (index !== undefined) {
      node = node.childNodes && node.childNodes[index]
    }
  }

  return node || null
}

const adjustOffsetReverse = (node: Node, offset: number): number => {
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue === zeroWidthSpace) {
    return 1
  }
  if (
    node.nodeType === Node.TEXT_NODE &&
    node.nodeValue &&
    offset > node.nodeValue.length
  ) {
    return node.nodeValue.length
  }
  return offset
}

const adjustOffset = (node: Node, offset: number): number => {
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue === zeroWidthSpace) {
    return 0
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const childNode = node.childNodes[offset - 1]
    if (childNode && childNode.nodeType === Node.TEXT_NODE) {
      return (childNode.nodeValue || '').length
    }
  }

  return offset
}

export type SelectionObject =
  | { selectionExists: false }
  | {
      selectionExists: true
      anchorOffset: number
      focusOffset: number
      anchorNode: number[]
      focusNode: number[]
    }

export class SelectionState extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['selection']
  }

  constructor() {
    super()
    this.selectionChange = this.selectionChange.bind(this)
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    console.log('SelectionState: attributeChangedCallback', {
      oldValue,
      newValue,
    })
    if (name !== 'selection' || !newValue) {
      return
    }
    const selectionObj: Record<string, string> = {}
    for (const pair of newValue.split(',')) {
      const splitPair = pair.split('=')
      if (splitPair.length === 2) {
        selectionObj[splitPair[0]] = splitPair[1]
      }
    }

    const focusOffset = Number(selectionObj['focus-offset'])
    const focusNode = this.findNodeFromPath(selectionObj['focus-node'])
    const anchorOffset = Number(selectionObj['anchor-offset'])
    const anchorNode = this.findNodeFromPath(selectionObj['anchor-node'])

    if (focusNode && anchorNode) {
      const sel = document.getSelection()
      if (sel) {
        const adjustedAnchorOffset = adjustOffsetReverse(
          anchorNode,
          anchorOffset,
        )
        const adjustedFocusOffset = adjustOffsetReverse(focusNode, focusOffset)
        if (
          sel.anchorNode === anchorNode &&
          sel.anchorOffset === adjustedAnchorOffset &&
          sel.focusNode === focusNode &&
          sel.focusOffset === adjustedFocusOffset
        ) {
          return
        }
        try {
          sel.setBaseAndExtent(
            anchorNode,
            adjustedAnchorOffset,
            focusNode,
            adjustedFocusOffset,
          )
        } catch (e) {
          // ignore selection errors
        }
      }
    }
  }

  connectedCallback(): void {
    document.addEventListener('selectionchange', this.selectionChange)
  }

  disconnectedCallback(): void {
    document.removeEventListener('selectionchange', this.selectionChange)
  }

  getSelectionPath(node: Node | null, offset: number): number[] | null {
    if (!(this.parentNode instanceof HTMLElement)) {
      return null
    }
    return getSelectionPath(node, this.parentNode, offset)
  }

  findNodeFromPath(path: string | number[] | null): Node | null {
    if (!(this.parentNode instanceof HTMLElement)) {
      return null
    }
    return findNodeFromPath(path, this.parentNode)
  }

  getSelectionObject(): SelectionObject {
    const selectionObj = getSelection()
    if (!selectionObj) {
      return { selectionExists: false }
    }
    if (!selectionObj.anchorNode || !selectionObj.focusNode) {
      return { selectionExists: false }
    }
    const anchorPath = this.getSelectionPath(
      selectionObj.anchorNode,
      selectionObj.anchorOffset,
    )
    const focusPath = this.getSelectionPath(
      selectionObj.focusNode,
      selectionObj.focusOffset,
    )
    if (!anchorPath || !focusPath) {
      return { selectionExists: false }
    }
    const anchorOffset = adjustOffset(
      selectionObj.anchorNode,
      selectionObj.anchorOffset,
    )
    const focusOffset = adjustOffset(
      selectionObj.focusNode,
      selectionObj.focusOffset,
    )
    return {
      selectionExists: true,
      anchorOffset: anchorOffset,
      focusOffset: focusOffset,
      anchorNode: anchorPath,
      focusNode: focusPath,
    }
  }

  selectionChange(): void {
    const selection = this.getSelectionObject()
    console.log('SelectionState: selectionChange dispatched', selection)
    const event = new CustomEvent('editorselectionchange', {
      detail: selection,
    })
    if (this.parentNode) {
      this.parentNode.dispatchEvent(event)
    }
  }
}

export class ElmEditor extends HTMLElement {
  composing = false
  lastCompositionTimeout: ReturnType<typeof setTimeout> | null = null
  initInterval: ReturnType<typeof setInterval> | null = null
  private _observer: MutationObserver

  compositionStart(): void {
    this.composing = true

    if (isAndroid()) {
      if (this.lastCompositionTimeout) {
        clearTimeout(this.lastCompositionTimeout)
      }
      const lastCompositionTimeout = setTimeout(() => {
        if (
          this.composing &&
          lastCompositionTimeout === this.lastCompositionTimeout
        ) {
          this.composing = false
          const newEvent = new CustomEvent('editorcompositionend', {
            detail: {},
          })
          this.dispatchEvent(newEvent)
        }
      }, 5000)
      this.lastCompositionTimeout = lastCompositionTimeout
    }
  }

  compositionEnd(): void {
    this.composing = false
    setTimeout(() => {
      if (!this.composing) {
        const newEvent = new CustomEvent('editorcompositionend', {
          detail: {},
        })
        this.dispatchEvent(newEvent)
      }
    }, 0)
  }

  constructor() {
    super()
    this.mutationObserverCallback = this.mutationObserverCallback.bind(this)
    this.pasteCallback = this.pasteCallback.bind(this)
    this._observer = new MutationObserver(this.mutationObserverCallback)
    this.addEventListener('paste', this.pasteCallback)
    this.addEventListener('compositionstart', this.compositionStart.bind(this))
    this.addEventListener('compositionend', this.compositionEnd.bind(this))
    this.dispatchInit = this.dispatchInit.bind(this)
  }

  connectedCallback(): void {
    this._observer.observe(this, {
      characterDataOldValue: true,
      attributeOldValue: false,
      attributes: false,
      childList: true,
      subtree: true,
      characterData: true,
    })
    this.initInterval = setInterval(this.dispatchInit, 1000)
  }

  disconnectedCallback(): void {
    this._observer.disconnect()
  }

  pasteCallback(e: ClipboardEvent): void {
    e.preventDefault()

    const clipboardData =
      e.clipboardData ||
      (window as Window & { clipboardData?: DataTransfer }).clipboardData
    const text = clipboardData ? clipboardData.getData('text') || '' : ''
    const html = clipboardData ? clipboardData.getData('text/html') || '' : ''
    const newEvent = new CustomEvent('pastewithdata', {
      detail: {
        text: text,
        html: html,
      },
    })
    this.dispatchEvent(newEvent)
  }

  characterDataMutations(
    mutationsList: MutationRecord[],
  ): Array<{ path: number[] | null; text: string | null }> | null {
    if (!mutationsList) {
      return null
    }

    const mutations: Array<{ path: number[] | null; text: string | null }> = []
    for (const mutation of mutationsList) {
      if (mutation.type !== 'characterData') {
        return null
      }
      mutations.push({
        path: getSelectionPath(mutation.target, this, 0),
        text: mutation.target.nodeValue,
      })
    }
    return mutations
  }

  mutationObserverCallback(mutationsList: MutationRecord[]): void {
    const element = this.querySelector('[data-rte-main="true"]')
    const selectionStateCandidate = this.querySelector('selection-state')
    const selectionStateEl =
      selectionStateCandidate instanceof SelectionState
        ? selectionStateCandidate
        : null
    const selection = selectionStateEl?.getSelectionObject() ?? {
      selectionExists: false,
    }

    const characterDataMutations = this.characterDataMutations(mutationsList)
    const event = new CustomEvent('editorchange', {
      detail: {
        root: element,
        selection: selection,
        isComposing: this.composing,
        characterDataMutations: characterDataMutations,
        timestamp: new Date().getTime(),
      },
    })
    this.dispatchEvent(event)
  }

  dispatchInit(): void {
    if (!this.isConnected) {
      return
    }
    const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
    const event = new CustomEvent('editorinit', {
      detail: {
        shortKey: isMacLike ? 'Meta' : 'Control',
      },
    })
    this.dispatchEvent(event)
    if (this.initInterval) {
      clearInterval(this.initInterval)
    }
  }
}

if (typeof window !== 'undefined') {
  if (!customElements.get('elm-editor')) {
    customElements.define('elm-editor', ElmEditor)
  }
  if (!customElements.get('selection-state')) {
    customElements.define('selection-state', SelectionState)
  }
}
