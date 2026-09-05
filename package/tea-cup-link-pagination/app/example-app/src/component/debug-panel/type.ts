export type Model = {
  readonly networkOnline: boolean
  readonly networkLatencyMs: number
}

export type Msg =
  | { readonly _tag: 'ToggleNetworkOnline' }
  | { readonly _tag: 'SetNetworkLatency'; readonly ms: number }
  | { readonly _tag: 'NoOp' }

export type Props = {
  readonly model: Model
  readonly loadedItemCount: number
  readonly activeRoomName: string | undefined
  readonly activeRoomUnreadCount: number
  readonly totalUnreadCount: number
  readonly dispatch: (msg: Msg) => void
  readonly onSimulateSse: () => void
  readonly onSimulateSseOtherRoom: () => void
  readonly onClearCacheAndReset: () => void
  readonly onHardReload: () => void
}
