import * as RD from '@devexperts/remote-data-ts'
import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { attemptTE } from '@rinn7e/tea-cup-prelude'
import { type AppRouteUpdater } from '@rinn7e/tea-cup-prelude/type/app-route-updater'
import { mkHttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import { size } from '@rinn7e/tea-cup-prelude/type/size'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as O from 'fp-ts/lib/Option'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { Cmd, type Sub } from 'tea-cup-fp'

import * as Api from '../../api'
import { type AppRoute } from '../../common/route/type'
import {
  type ChatItemMsg,
  type Model,
  type Msg,
  type ParentContext,
} from './type'
import { logicConfig } from './util'

export const mkLinkPaginationMode = (
  roomId: string,
  targetChatId: string | null,
  latencyMs: number,
  networkOnline: boolean,
): LinkPagination.Mode<Api.Chat> => {
  return {
    dataSourceId: roomId,
    overallData: SUA.empty(),
    prevData: RD.initial,
    prevSize: size(15),
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
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        ),
    }),
    initialData: RD.initial,
    selectedKey: targetChatId ? targetChatId.replace('-repoint', '') : null,
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
            limit: pageSize,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
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
            limit: pageSize,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        )
      },
    }),
    nextData: RD.initial,
    nextSize: size(15),
    nextIsMax: false,
  }
}

export const customScrollToNewestHandler = (
  model: LinkPagination.Model<Api.Chat>,
): [
  LinkPagination.Model<Api.Chat>,
  Cmd<LinkPagination.Msg<Api.Chat, ChatItemMsg, AppRoute>>,
  AppRouteUpdater<AppRoute>,
] => {
  if (model.mode.nextIsMax) {
    const [m, c] = LinkPagination.scrollToNewestHandler<
      Api.Chat,
      ChatItemMsg,
      AppRoute
    >(logicConfig.refs, logicConfig.isReversed, model)
    return [m, c, null]
  } else {
    return [
      model,
      Cmd.none(),
      (route) => ({
        ...route,
        page:
          route.page._tag === 'RoomChatPage'
            ? {
                ...route.page,
                targetChatId: O.none,
              }
            : route.page,
      }),
    ]
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
  const scrollStateMap = LinkPagination.mkScrollStateMap()
  const [linkPagin, linkPaginCmd] = LinkPagination.init<
    Api.Chat,
    ChatItemMsg,
    AppRoute
  >(
    networkOnline,
    initialMode,
    LinkPagination.storeScrollState(scrollStateMap),
    LinkPagination.mkShouldRestoreScrollState(roomId, scrollStateMap),
  )

  const model: Model = {
    roomId,
    linkPagin,
    scrollStateMap,
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
  _refs: LinkPagination.Refs,
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
    const parentContext: ParentContext = {
      currentUserId: 'user-master',
      highlightedChatId: targetChatId,
      room: undefined,
      dispatch: () => {},
    }
    const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
      Api.Chat,
      ParentContext,
      ChatItemMsg,
      AppRoute
    >(networkOnline, logicConfig)(
      parentContext,
      {
        _tag: 'SetModeAndAddUpdateData',
        mode: newMode,
        data: null,
        shouldReload: true,
        onContainerScroll: LinkPagination.storeScrollState(
          oldModel.scrollStateMap,
        ),
        shouldRestoreScrollState: LinkPagination.mkShouldRestoreScrollState(
          roomId,
          oldModel.scrollStateMap,
        ),
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

  // Restore scroll position using LinkPagination.forceScrollToHandler (CF Pattern)
  const [updatedLinkPagin, linkPaginCmd] =
    oldModel.linkPagin.savedScrollPos !== null
      ? LinkPagination.forceScrollToHandler<Api.Chat, ChatItemMsg, AppRoute>(
          logicConfig.refs,
          oldModel.linkPagin,
          {
            top: oldModel.linkPagin.savedScrollPos,
          },
        )
      : [
          oldModel.linkPagin,
          Cmd.none<LinkPagination.Msg<Api.Chat, ChatItemMsg, AppRoute>>(),
        ]

  return [
    {
      ...oldModel,
      roomId,
      linkPagin: {
        ...updatedLinkPagin,
        mode: {
          ...updatedLinkPagin.mode,
          nextIsMax: false,
          prevIsMax: false,
        },
      },
    },
    linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
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
      return sendChatSuccessHandler(msg.chat, model)
    case 'UpdateChatSuccess':
      return updateChatSuccessHandler(msg.chat, model)
    case 'DeleteChatSuccess':
      return deleteChatSuccessHandler(msg.chatId, model)
    case 'SetSearchQuery':
      return setSearchQueryHandler(msg.query, model, networkOnline)
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
  _refs: LinkPagination.Refs,
  networkOnline: boolean,
): [Model, Cmd<Msg>] => {
  if (subMsg._tag === 'ChildMsg' && subMsg.subMsg._tag === 'DeleteChat') {
    return deleteChatSuccessHandler(subMsg.childId, model)
  }

  if (subMsg._tag === 'ScrollToNewest') {
    const [linkPaginModel, linkPaginCmd] = customScrollToNewestHandler(
      model.linkPagin,
    )
    return [
      { ...model, linkPagin: linkPaginModel },
      linkPaginCmd.map((m): Msg => ({ _tag: 'LinkPaginMsg', subMsg: m })),
    ]
  }

  const parentContext: ParentContext = {
    currentUserId: 'user-master',
    highlightedChatId: model.highlightedChatId,
    room: undefined,
    dispatch: () => {},
  }
  const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
    Api.Chat,
    ParentContext,
    ChatItemMsg,
    AppRoute
  >(networkOnline, logicConfig)(parentContext, subMsg, model.linkPagin)

  return [
    { ...model, linkPagin: newLinkPagin },
    linkPaginCmd.map((m): Msg => ({ _tag: 'LinkPaginMsg', subMsg: m })),
  ]
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
): [Model, Cmd<Msg>] => {
  const parentContext: ParentContext = {
    currentUserId: 'user-master',
    highlightedChatId: model.highlightedChatId,
    room: undefined,
    dispatch: () => {},
  }
  const [newLinkPagin, addCmd] = LinkPagination.update<
    Api.Chat,
    ParentContext,
    ChatItemMsg,
    AppRoute
  >(true, logicConfig)(
    parentContext,
    {
      _tag: 'AddOrUpdateData',
      dataSourceId: model.roomId,
      value: [{ data: chat, previousId: null }],
      compareId: (a, id) => a.id === id,
    },
    model.linkPagin,
  )

  const [finalLinkPagin, scrollCmd] = LinkPagination.scrollToNewestHandler<
    Api.Chat,
    ChatItemMsg,
    AppRoute
  >(logicConfig.refs, true, newLinkPagin)

  return [
    {
      ...model,
      linkPagin: finalLinkPagin,
    },
    Cmd.batch([
      addCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
      scrollCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
    ]),
  ]
}

const updateChatSuccessHandler = (
  chat: Api.Chat,
  model: Model,
): [Model, Cmd<Msg>] => {
  const parentContext: ParentContext = {
    currentUserId: 'user-master',
    highlightedChatId: model.highlightedChatId,
    room: undefined,
    dispatch: () => {},
  }
  const [newLinkPagin, cmd] = LinkPagination.update<
    Api.Chat,
    ParentContext,
    ChatItemMsg,
    AppRoute
  >(true, logicConfig)(
    parentContext,
    {
      _tag: 'AddOrUpdateData',
      dataSourceId: model.roomId,
      value: [{ data: chat, previousId: null }],
      compareId: (a, id) => a.id === id,
    },
    model.linkPagin,
  )

  return [
    { ...model, linkPagin: newLinkPagin },
    cmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

const deleteChatSuccessHandler = (
  chatId: string,
  model: Model,
): [Model, Cmd<Msg>] => {
  const parentContext: ParentContext = {
    currentUserId: 'user-master',
    highlightedChatId: model.highlightedChatId,
    room: undefined,
    dispatch: () => {},
  }
  const [newLinkPagin, cmd] = LinkPagination.update<
    Api.Chat,
    ParentContext,
    ChatItemMsg,
    AppRoute
  >(true, logicConfig)(
    parentContext,
    {
      _tag: 'ReplaceFunc',
      func: (overallData) => [
        SUA.filter((c: Api.Chat) => c.id !== chatId)(overallData),
        null,
      ],
      containerChangeEvent: { _tag: 'ElementModifyInPlace' },
    },
    model.linkPagin,
  )

  return [
    { ...model, linkPagin: newLinkPagin },
    cmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

const setSearchQueryHandler = (
  query: string,
  model: Model,
  networkOnline: boolean = true,
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
        Api.searchChats({ query, roomId: model.roomId, networkOnline }),
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
    ChatItemMsg,
    AppRoute
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
    ChatItemMsg,
    AppRoute
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
    ChatItemMsg,
    AppRoute
  >(refs, true, model.linkPagin)

  return [
    { ...model, linkPagin: newLinkPagin },
    scrollCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

export const subscriptions = (model: Model): Sub<Msg> =>
  LinkPagination.subscriptions<Api.Chat, ChatItemMsg, AppRoute>(
    model.linkPagin,
  ).map(
    (subMsg): Msg => ({
      _tag: 'LinkPaginMsg',
      subMsg,
    }),
  )
