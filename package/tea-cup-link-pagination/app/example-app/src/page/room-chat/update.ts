import * as RD from '@devexperts/remote-data-ts'
import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { attemptTE, cmdSucceed, updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { Cmd, type Sub } from 'tea-cup-fp'

import * as Api from '../../api'
import { type ChatItemMsg, type Model, type Msg } from './type'
import { mkLogicConfig } from './util'

export const mkLinkPaginationMode = (
  roomId: string,
  targetChatId: string | null,
  latencyMs: number,
  networkOnline: boolean,
): LinkPagination.Mode<Api.Chat> => {
  return {
    dataSourceId: roomId,
    overallData: LinkPagination.SUA.empty(),
    prevData: RD.initial,
    prevSize: LinkPagination.size(15),
    prevIsMax: false,
    allowRetryPrev: false,

    initialHandler: () => ({
      cache: async () => Api.getCachedChats(roomId),
      endpoint: () =>
        pipe(
          Api.fetchInitialChats({
            roomId,
            targetChatId,
            pageSize: 15,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => httpErr.actualErr),
        ),
    }),
    initialData: RD.initial,
    selectedKey: targetChatId,
    retriggerCurrentData: 'done',
    animationEnd: false,

    prevHandler: (overallData) => (pageSize) => ({
      cache: async () => Api.getCachedChats(roomId),
      endpoint: () => {
        const beforeTimestamp =
          overallData.length > 0
            ? overallData[overallData.length - 1]?.timestamp
            : undefined
        return pipe(
          Api.fetchPrevChats({
            roomId,
            beforeTimestamp,
            limit: pageSize.value,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => httpErr.actualErr),
        )
      },
    }),

    nextHandler: (overallData) => (pageSize) => ({
      cache: async () => Api.getCachedChats(roomId),
      endpoint: () => {
        const afterTimestamp =
          overallData.length > 0 ? overallData[0]?.timestamp : undefined
        return pipe(
          Api.fetchNextChats({
            roomId,
            afterTimestamp,
            limit: pageSize.value,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => httpErr.actualErr),
        )
      },
    }),
    nextData: RD.initial,
    nextSize: LinkPagination.size(15),
    nextIsMax: false,
  }
}

export const init = (
  roomId: string,
  targetChatId: string | null = null,
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  const initialMode = mkLinkPaginationMode(
    roomId,
    targetChatId,
    latencyMs,
    networkOnline,
  )
  const [linkPagin, linkPaginCmd] = LinkPagination.init<Api.Chat, ChatItemMsg>(
    networkOnline,
    initialMode,
  )

  const model: Model = {
    roomId,
    linkPagin,
    highlightedChatId: targetChatId,
    inputDraft: '',
    searchQuery: '',
    searchResults: [],
    isSearchDropdownOpen: false,
  }

  return [
    model,
    linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

export const reInit = (
  roomId: string,
  targetChatId: string | null,
  oldModel: Model,
  refs: LinkPagination.Refs,
  latencyMs = 80,
  networkOnline = true,
  forceRefresh = false,
): [Model, Cmd<Msg>] => {
  if (forceRefresh || targetChatId) {
    const newMode = mkLinkPaginationMode(
      roomId,
      targetChatId,
      latencyMs,
      networkOnline,
    )
    const logicConfig = mkLogicConfig(oldModel, refs)
    const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
      Api.Chat,
      ChatItemMsg
    >(networkOnline, logicConfig)(
      {
        _tag: 'SetModeAndAddUpdateData',
        mode: newMode,
        data: null,
        shouldReload: true,
      },
      oldModel.linkPagin,
    )

    return [
      {
        ...oldModel,
        roomId,
        linkPagin: newLinkPagin,
        highlightedChatId: targetChatId,
      },
      linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
    ]
  }

  // Restore scroll position using anchor-based scrollStateMap, or scroll to bottom (newest)
  const scrollCmd: Cmd<Msg> = cmdSucceed(() => {
    requestAnimationFrame(() => {
      if (refs.containerRef.current) {
        const container = refs.containerRef.current
        const restored = LinkPagination.restoreScrollState(
          oldModel.linkPagin.scrollStateMap,
        )(roomId, container)
        if (!restored) {
          const targetScroll = container.scrollHeight
          refs.currentScrollPosRef.current = targetScroll
          container.scrollTo({ top: targetScroll })
        }
      }
    })
  }).map((): Msg => ({ _tag: 'NoOp' }))

  return [
    {
      ...oldModel,
      roomId,
      linkPagin: {
        ...oldModel.linkPagin,
        mode: {
          ...oldModel.linkPagin.mode,
          nextIsMax: false,
          prevIsMax: false,
        },
      },
    },
    scrollCmd,
  ]
}

export const update = (
  msg: Msg,
  model: Model,
  refs: LinkPagination.Refs,
  networkOnline: boolean = true,
): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]
    case 'LinkPaginMsg':
      return linkPaginMsgHandler(msg.subMsg, model, refs, networkOnline)
    case 'UpdateInputDraft':
      return updateInputDraftHandler(msg.text, model)
    case 'SendChat':
      return sendChatHandler(model, networkOnline)
    case 'SendChatSuccess':
      return sendChatSuccessHandler(msg.chat, model, refs)
    case 'UpdateChatSuccess':
      return updateChatSuccessHandler(msg.chat, model)
    case 'SetSearchQuery':
      return setSearchQueryHandler(msg.query, model)
    case 'SearchResponse':
      return searchResponseHandler(msg.results, model)
    case 'CloseSearchDropdown':
      return closeSearchDropdownHandler(model)
    case 'JumpToChat':
      return jumpToChatHandler(msg.chatId, model, refs)
    case 'JumpToUnread':
      return jumpToUnreadHandler(model, refs)
    case 'ScrollToBottom':
      return scrollToBottomHandler(model, refs)
  }
}

// -------------------------------------------
// Top-Level Handlers
// -------------------------------------------

const linkPaginMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'LinkPaginMsg' }>['subMsg'],
  model: Model,
  refs: LinkPagination.Refs,
  networkOnline: boolean,
): [Model, Cmd<Msg>] => {
  const logicConfig = mkLogicConfig(model, refs)
  const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
    Api.Chat,
    ChatItemMsg
  >(networkOnline, logicConfig)(subMsg, model.linkPagin)

  return pipe(
    [
      { ...model, linkPagin: newLinkPagin },
      linkPaginCmd.map(
        (m): Msg => ({
          _tag: 'LinkPaginMsg',
          subMsg: m,
        }),
      ),
    ] satisfies [Model, Cmd<Msg>],
    updateAndCmd((m) => {
      if (subMsg._tag === 'ItemMsg') {
        const [updatedModel, cmd, containerChangeEvent] = chatItemMsgHandler(
          subMsg.item,
          subMsg.msg,
        )(m)
        return [
          {
            ...updatedModel,
            linkPagin: {
              ...updatedModel.linkPagin,
              containerChangeEvent,
            },
          },
          cmd,
        ]
      }
      return [m, Cmd.none()]
    }),
  )
}

const updateInputDraftHandler = (
  text: string,
  model: Model,
): [Model, Cmd<Msg>] => [{ ...model, inputDraft: text }, Cmd.none()]

const sendChatHandler = (
  model: Model,
  networkOnline: boolean,
): [Model, Cmd<Msg>] => {
  const content = model.inputDraft.trim()
  if (!content) return [model, Cmd.none()]

  return [
    { ...model, inputDraft: '' },
    attemptTE(
      Api.sendChat({
        roomId: model.roomId,
        content,
        authorId: 'user-master',
        networkOnline,
      }),
      (result): Msg => {
        if (result.tag === 'Ok') {
          return { _tag: 'SendChatSuccess', chat: result.value }
        }
        return { _tag: 'NoOp' }
      },
    ),
  ]
}

const sendChatSuccessHandler = (
  chat: Api.Chat,
  model: Model,
  refs: LinkPagination.Refs,
): [Model, Cmd<Msg>] => {
  const logicConfig = mkLogicConfig(model, refs)
  const newLinkPagin = LinkPagination.addOrUpdateDataHandler(
    logicConfig,
    model.linkPagin,
    chat,
  )

  const [finalLinkPagin, scrollCmd] = LinkPagination.scrollToNewestHandler<
    Api.Chat,
    ChatItemMsg
  >(refs, true, newLinkPagin)

  return [
    {
      ...model,
      linkPagin: finalLinkPagin,
    },
    scrollCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

const updateChatSuccessHandler = (
  chat: Api.Chat,
  model: Model,
): [Model, Cmd<Msg>] => {
  const newLinkPagin = LinkPagination.updateItem(chat.id, chat, {
    _tag: 'ElementModifyInPlace',
  })(model.linkPagin)

  return [{ ...model, linkPagin: newLinkPagin }, Cmd.none()]
}

const setSearchQueryHandler = (
  query: string,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (!query.trim()) {
    return [
      {
        ...model,
        searchQuery: query,
        searchResults: [],
        isSearchDropdownOpen: false,
      },
      Cmd.none(),
    ]
  }

  return [
    {
      ...model,
      searchQuery: query,
      isSearchDropdownOpen: true,
    },
    attemptTE(
      pipe(
        Api.searchChats({ query, roomId: model.roomId }),
        TE.mapLeft((httpErr) => httpErr.actualErr),
      ),
      (result): Msg => {
        if (result.tag === 'Ok') {
          return { _tag: 'SearchResponse', results: result.value }
        }
        return { _tag: 'SearchResponse', results: [] }
      },
    ),
  ]
}

const searchResponseHandler = (
  results: Api.Chat[],
  model: Model,
): [Model, Cmd<Msg>] => [
  {
    ...model,
    searchResults: results,
    isSearchDropdownOpen: results.length > 0,
  },
  Cmd.none(),
]

const closeSearchDropdownHandler = (model: Model): [Model, Cmd<Msg>] => [
  { ...model, isSearchDropdownOpen: false },
  Cmd.none(),
]

const jumpToChatHandler = (
  chatId: string,
  model: Model,
  refs: LinkPagination.Refs,
): [Model, Cmd<Msg>] => {
  const targetChat = model.searchResults.find((m) => m.id === chatId)

  const [newLinkPagin, scrollCmd] = LinkPagination.scrollToKeyHandler<
    Api.Chat,
    ChatItemMsg
  >(refs, model.linkPagin, chatId)

  return [
    {
      ...model,
      linkPagin: newLinkPagin,
      highlightedChatId: chatId,
      isSearchDropdownOpen: false,
      searchQuery: targetChat
        ? targetChat.content.slice(0, 20)
        : model.searchQuery,
    },
    scrollCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

const jumpToUnreadHandler = (
  model: Model,
  refs: LinkPagination.Refs,
): [Model, Cmd<Msg>] => {
  const firstUnread = model.linkPagin.mode.overallData.value.find(
    (c) => c.isUnread,
  )
  if (!firstUnread) return [model, Cmd.none()]

  const [newLinkPagin, scrollCmd] = LinkPagination.scrollToKeyHandler<
    Api.Chat,
    ChatItemMsg
  >(refs, model.linkPagin, firstUnread.id)

  return [
    {
      ...model,
      linkPagin: newLinkPagin,
      highlightedChatId: firstUnread.id,
    },
    scrollCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

const scrollToBottomHandler = (
  model: Model,
  refs: LinkPagination.Refs,
): [Model, Cmd<Msg>] => {
  const [newLinkPagin, scrollCmd] = LinkPagination.scrollToNewestHandler<
    Api.Chat,
    ChatItemMsg
  >(refs, true, model.linkPagin)

  const directScrollCmd: Cmd<Msg> = Cmd.batch([
    scrollCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
    attemptTE(
      TE.rightIO(() => {
        if (refs.containerRef.current) {
          refs.containerRef.current.scrollTop =
            refs.containerRef.current.scrollHeight
        }
      }),
      (): Msg => ({ _tag: 'NoOp' }),
    ),
  ])

  return [{ ...model, linkPagin: newLinkPagin }, directScrollCmd]
}

const chatItemMsgHandler =
  (item: Api.Chat, msg: ChatItemMsg) =>
  (model: Model): [Model, Cmd<Msg>, LinkPagination.ContainerChangeEvent] => {
    switch (msg._tag) {
      case 'ToggleReaction': {
        const emoji = msg.emoji
        const myUserId = 'user-master'
        return [
          model,
          attemptTE(
            Api.toggleChatReaction({
              roomId: item.roomId,
              chatId: item.id,
              emoji,
              userId: myUserId,
            }),
            (result): Msg => {
              if (result.tag === 'Ok') {
                return { _tag: 'UpdateChatSuccess', chat: result.value }
              }
              return { _tag: 'NoOp' }
            },
          ),
          { _tag: 'ElementModifyInPlace' },
        ]
      }

      case 'ToggleStar': {
        return [
          model,
          attemptTE(
            Api.toggleChatStar({
              roomId: item.roomId,
              chatId: item.id,
            }),
            (result): Msg => {
              if (result.tag === 'Ok') {
                return { _tag: 'UpdateChatSuccess', chat: result.value }
              }
              return { _tag: 'NoOp' }
            },
          ),
          { _tag: 'ElementModifyInPlace' },
        ]
      }

      case 'Reply': {
        const replyDraft = `@${item.author.name} `
        return [
          { ...model, inputDraft: replyDraft },
          Cmd.none(),
          { _tag: 'NoChange' },
        ]
      }
    }
  }

export const subscriptions = (model: Model): Sub<Msg> =>
  LinkPagination.subscriptions<Api.Chat, ChatItemMsg>(model.linkPagin).map(
    (subMsg): Msg => ({
      _tag: 'LinkPaginMsg',
      subMsg,
    }),
  )
