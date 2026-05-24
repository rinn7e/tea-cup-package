export type Item = {
  id: string
  height: number
  inView: boolean
}

export type Model = {
  items: Item[]
  topReachedCount: number
  bottomReachedCount: number
}

export type Msg =
  | { _tag: 'SetInView'; index: number; inView: boolean }
  | { _tag: 'TopReached' }
  | { _tag: 'BottomReached' }
