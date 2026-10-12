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
import { type MyDB } from '../../common/cache/db/type'
import {
  AppPageEq,
  type AppRoute,
  isNewChatTarget,
} from '../../common/route/type'
import {
  type ChatItemMsg,
  type Model,
  type Msg,
  type ParentContext,
} from './type'
import { logicConfig } from './util'

// The room's chats, from the cache then the API (`callChatsEndpoint`,
// `callChatCurrentPrevNextEndpoint`)
export const mkLinkPaginationMode = (
  db: MyDB | null,
  roomId: string,
  targetChatId: string | null,
  _latencyMs: number,
  networkOnline: boolean,
): LinkPagination.Mode<Api.Chat> => {
  const initialPageSize = 15
  // In the reproduction scenario (`-repoint`), the server re-points the
  // provisional target to the latest messages at the end
  const isRepointScenario = targetChatId?.includes('repoint') ?? false
  const selectedKey = targetChatId ? targetChatId.replace('-repoint', '') : null

  // The newest page; `isRepointed` when it answers an open at a target
  const noSelectedKeyInitialHandler = (
    isRepointed = false,
  ): ReturnType<LinkPagination.InitialHandler<Api.Chat>> => {
    const { cache, endpoint } = Api.callChatsEndpoint(db, {
      roomId,
      pageSize: initialPageSize,
    })
    return {
      cache: LinkPagination.mkCacheHandler(
        cache(networkOnline),
        (response) => response.data,
      ),
      endpoint: (networkStatus, cacheData) =>
        pipe(
          endpoint(networkStatus, cacheData),
          TE.map((response) => ({
            dataF: () => response.data,
            nextIsMax: true,
            ...(isRepointed ? { selectedKey: null } : {}),
          })),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        ),
    }
  }

  // The page around `key`: the cache's read around it, or nothing when it
  // isn't cached, as the endpoint answers (`InitialHandler`)
  const withSelectedKeyInitialHandler = (
    key: string,
  ): ReturnType<LinkPagination.InitialHandler<Api.Chat>> => {
    const { cache, endpoint } = Api.callChatCurrentPrevNextEndpoint(db, {
      roomId,
      chatId: key,
      pageSize: initialPageSize,
    })
    return {
      cache: LinkPagination.mkCacheHandler(
        cache(networkOnline),
        ([current, prev, next]) => [...prev.data, current, ...next.data],
      ),
      endpoint: isRepointScenario
        ? // The newest page instead; the cached rows around the target
          // aren't stale
          (networkStatus) =>
            noSelectedKeyInitialHandler(true).endpoint(networkStatus, [])
        : (networkStatus, cacheData) =>
            pipe(
              endpoint(networkStatus, cacheData),
              TE.map((result) =>
                result
                  ? {
                      dataF: () => [
                        ...result[1].data,
                        result[0],
                        ...result[2].data,
                      ],
                      nextIsMax: result[2].data.length === 0,
                      selectedKey: key,
                    }
                  : { dataF: () => [], nextIsMax: true, selectedKey: null },
              ),
              TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
            ),
    }
  }

  return {
    dataSourceId: roomId,
    overallData: SUA.empty(),
    prev: { _tag: 'Idle' },
    prevSize: size(initialPageSize),

    initialHandler: () =>
      selectedKey === null
        ? noSelectedKeyInitialHandler()
        : withSelectedKeyInitialHandler(selectedKey),
    initial: { _tag: 'NotStarted' },
    selectedKey,

    prevHandler: (overallData) => (pageSize) => {
      const beforeTimestamp =
        overallData.length > 0
          ? overallData[overallData.length - 1]?.timestamp
          : undefined
      const { cache, endpoint } = Api.callChatsEndpoint(db, {
        roomId,
        beforeTimestamp,
        pageSize,
      })
      return {
        cache: LinkPagination.mkCacheHandler(
          cache(networkOnline),
          (response) => response.data,
        ),
        endpoint: (networkStatus, cacheData) =>
          pipe(
            endpoint(networkStatus, cacheData),
            TE.map((response) => response.data),
            TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
          ),
      }
    },

    nextHandler: (overallData) => (pageSize) => {
      const afterTimestamp =
        overallData.length > 0 ? overallData[0]?.timestamp : undefined
      const { cache, endpoint } = Api.callChatsEndpoint(db, {
        roomId,
        afterTimestamp,
        pageSize,
      })
      return {
        cache: LinkPagination.mkCacheHandler(
          cache(networkOnline),
          (response) => response.data,
        ),
        endpoint: (networkStatus, cacheData) =>
          pipe(
            endpoint(networkStatus, cacheData),
            TE.map((response) => response.data),
            TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
          ),
      }
    },
    next: { _tag: 'Idle' },
    nextSize: size(initialPageSize),
  }
}

export const customScrollToNewestHandler = (
  model: LinkPagination.Model<Api.Chat>,
): [
  LinkPagination.Model<Api.Chat>,
  Cmd<LinkPagination.Msg<Api.Chat, ChatItemMsg, AppRoute>>,
  AppRouteUpdater<AppRoute>,
] => {
  if (LinkPagination.isAtNewest(model)) {
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
  db: MyDB | null,
  roomId: string,
  targetChatId: string | null = null,
  latencyMs = 80,
  networkOnline = true,
  scrollStateRef = LinkPagination.newScrollStateRef(),
): [Model, Cmd<Msg>] => {
  const initialMode = mkLinkPaginationMode(
    db,
    roomId,
    targetChatId,
    latencyMs,
    networkOnline,
  )
  const [linkPagin, linkPaginCmd] = LinkPagination.init<
    Api.Chat,
    ChatItemMsg,
    AppRoute
  >(networkOnline, initialMode, LinkPagination.storeScrollState(scrollStateRef))

  const model: Model = {
    roomId,
    linkPagin,
    scrollStateRef,
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

const isSameRoomChatPage = (oldRoute: AppRoute, newRoute: AppRoute) =>
  oldRoute.page._tag === 'RoomChatPage' &&
  newRoute.page._tag === 'RoomChatPage' &&
  oldRoute.page.roomId === newRoute.page.roomId

export const reInit = (
  db: MyDB | null,
  roomId: string,
  targetChatId: string | null,
  oldModel: Model,
  oldRoute: AppRoute,
  newRoute: AppRoute,
  latencyMs = 80,
  networkOnline = true,
  forceRefresh = false,
): [Model, Cmd<Msg>] => {
  // Use old state (the page is the same)
  if (AppPageEq.equals(oldRoute.page, newRoute.page) && !forceRefresh) {
    return [oldModel, Cmd.none()]
  }

  // The same room without a target (back after a link): keep the model, the
  // list stays where the reader is
  else if (
    !forceRefresh &&
    isSameRoomChatPage(oldRoute, newRoute) &&
    targetChatId === null
  ) {
    return [oldModel, Cmd.none()]
  }

  // Restore the room's model: another page, with no target to open at
  else if (
    !forceRefresh &&
    !isSameRoomChatPage(oldRoute, newRoute) &&
    targetChatId === null
  ) {
    // Restore the reading position, and reopen both ends
    const [updatedLinkPagin, linkPaginCmd] = LinkPagination.restoreSavedScroll<
      Api.Chat,
      ParentContext,
      ChatItemMsg,
      AppRoute
    >(logicConfig, oldModel.scrollStateRef, { resetEdges: true })(
      oldModel.linkPagin,
    )

    return [
      {
        ...oldModel,
        roomId,
        linkPagin: updatedLinkPagin,
      },
      linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
    ]
  }

  // Re-init: a fresh list for the new open, keeping the room's stored
  // positions
  else {
    const isSameRoom = isSameRoomChatPage(oldRoute, newRoute)

    // Re-initing the same room keeps its loaded chats: the list stays visible
    // while the first page loads again, instead of going back to the loader.
    // The open continues, so its one scroll isn't due again, unless the room
    // now opens at another chat (`isNewChatTarget`): a new open over the kept
    // chats, scrolled to its target
    const preserved =
      isSameRoom && !LinkPagination.isEmpty(oldModel.linkPagin)
        ? oldModel.linkPagin
        : null

    const [m, cmd] = init(
      db,
      roomId,
      targetChatId,
      latencyMs,
      networkOnline,
      oldModel.scrollStateRef,
    )

    return [
      {
        ...m,
        // The same room keeps its draft and search
        ...(isSameRoom
          ? {
              inputDraft: oldModel.inputDraft,
              searchQuery: oldModel.searchQuery,
              searchResults: oldModel.searchResults,
              isSearchDropdownOpen: oldModel.isSearchDropdownOpen,
            }
          : {}),
        linkPagin: preserved
          ? {
              ...m.linkPagin,
              initialScroll: isNewChatTarget(oldRoute.page, newRoute.page)
                ? m.linkPagin.initialScroll
                : preserved.initialScroll,
              mode: {
                ...m.linkPagin.mode,
                initial: preserved.mode.initial,
                overallData: preserved.mode.overallData,
              },
            }
          : m.linkPagin,
      },
      cmd,
    ]
  }
}

export const update = (
  db: MyDB | null,
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
      return sendChatHandler(db, model, networkOnline)
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
  db: MyDB | null,
  model: Model,
  networkOnline: boolean,
): [Model, Cmd<Msg>] => {
  const content = model.inputDraft.trim()
  if (!content) return [model, Cmd.none()]

  return [
    { ...model, inputDraft: '' },
    attemptTE(
      Api.sendChat(db, {
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
      compareId: (item, id) => item.id === id,
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
      compareId: (item, id) => item.id === id,
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
  LinkPagination.subscriptions<Api.Chat, ChatItemMsg, AppRoute, ParentContext>(
    model.linkPagin,
    logicConfig,
  ).map(
    (subMsg): Msg => ({
      _tag: 'LinkPaginMsg',
      subMsg,
    }),
  )
