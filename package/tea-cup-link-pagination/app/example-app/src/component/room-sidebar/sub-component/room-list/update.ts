import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { mkHttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import { size } from '@rinn7e/tea-cup-prelude/type/size'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as Api from '../../../../api'
import { type MyDB } from '../../../../common/cache/db/type'
import { AppPageEq, type AppRoute } from '../../../../common/route/type'
import {
  type Model,
  type Msg,
  type ParentContext,
  type RoomItemMsg,
} from './type'
import { logicConfig } from './util'

// The rooms, from the cache then the API (`callRoomsEndpoint`,
// `callRoomCurrentPrevNextEndpoint`)
export const mkRoomListLinkPaginationMode = (
  db: MyDB | null,
  activeRoomId: string | null,
  _latencyMs: number,
  networkOnline: boolean,
): LinkPagination.Mode<Api.Room> => {
  const initialPageSize = 15

  // The most recently active rooms
  const noSelectedKeyInitialHandler = (): ReturnType<
    LinkPagination.InitialHandler<Api.Room>
  > => {
    const { cache, endpoint } = Api.callRoomsEndpoint(db, {
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
          })),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        ),
    }
  }

  // The page around `roomId`: the cache's read around it, or nothing when it
  // isn't cached, as the endpoint answers (`InitialHandler`)
  const withSelectedKeyInitialHandler = (
    roomId: string,
  ): ReturnType<LinkPagination.InitialHandler<Api.Room>> => {
    const { cache, endpoint } = Api.callRoomCurrentPrevNextEndpoint(db, {
      roomId,
      pageSize: initialPageSize,
    })
    return {
      cache: LinkPagination.mkCacheHandler(
        cache(networkOnline),
        ([current, prev, next]) => [...prev.data, current, ...next.data],
      ),
      endpoint: (networkStatus, cacheData) =>
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
                }
              : { dataF: () => [], nextIsMax: true },
          ),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        ),
    }
  }

  // A page next to the loaded rooms
  const pageHandler = (param: {
    beforeTimestamp?: number
    afterTimestamp?: number
    pageSize: number
  }) => {
    const { cache, endpoint } = Api.callRoomsEndpoint(db, param)
    return {
      cache: LinkPagination.mkCacheHandler(
        cache(networkOnline),
        (response: Api.Pagination<Api.Room>) => response.data,
      ),
      endpoint: (networkStatus: boolean, cacheData: Api.Room[]) =>
        pipe(
          endpoint(networkStatus, cacheData),
          TE.map((response) => response.data),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        ),
    }
  }

  return {
    dataSourceId: 'sidebar-rooms',
    overallData: SUA.empty(),
    prev: { _tag: 'Idle' },
    prevSize: size(initialPageSize),

    initialHandler: () =>
      activeRoomId === null
        ? noSelectedKeyInitialHandler()
        : withSelectedKeyInitialHandler(activeRoomId),
    initial: { _tag: 'NotStarted' },
    selectedKey: activeRoomId,

    // prevHandler: loads older / more items below (bottom of list when non-reversed)
    prevHandler: (overallData) => (pageSize) =>
      pageHandler({
        beforeTimestamp:
          overallData.length > 0
            ? overallData[overallData.length - 1]?.lastMessage?.timestamp
            : undefined,
        pageSize,
      }),

    // nextHandler: loads newer / items above (top of list when non-reversed)
    nextHandler: (overallData) => (pageSize) =>
      pageHandler({
        afterTimestamp:
          overallData.length > 0
            ? overallData[0]?.lastMessage?.timestamp
            : undefined,
        pageSize,
      }),
    next: { _tag: 'Exhausted' },
    nextSize: size(initialPageSize),
  }
}

export const init = (
  db: MyDB | null,
  activeRoomId: string | null = 'room-general',
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  const mode = mkRoomListLinkPaginationMode(
    db,
    activeRoomId,
    latencyMs,
    networkOnline,
  )
  const [linkPagin, linkPaginCmd] = LinkPagination.init<
    Api.Room,
    RoomItemMsg,
    AppRoute
  >(networkOnline, mode)

  const model: Model = {
    linkPagin,
    expandedRoomIds: new Set<string>(),
  }

  return [
    model,
    linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

export const reInit = (
  db: MyDB | null,
  activeRoomId: string | undefined,
  oldModel: Model,
  oldRoute: AppRoute,
  newRoute: AppRoute,
  forceRefresh: boolean,
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  // Use old state (the page is the same)
  if (AppPageEq.equals(oldRoute.page, newRoute.page) && !forceRefresh) {
    return [oldModel, Cmd.none()]
  }
  // Another room is active: keep the list, and select the room in it
  else if (!forceRefresh) {
    return [
      {
        ...oldModel,
        linkPagin: LinkPagination.setSelectedKey(activeRoomId ?? null)(
          oldModel.linkPagin,
        ),
      },
      Cmd.none(),
    ]
  }
  // Otherwise initialize everything
  else return init(db, activeRoomId ?? null, latencyMs, networkOnline)
}

export const update = (
  msg: Msg,
  model: Model,
  networkOnline: boolean = true,
): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]

    case 'LinkPaginMsg':
      return linkPaginMsgHandler(msg.subMsg, model, networkOnline)

    case 'SelectRoom':
      return [model, Cmd.none()]

    case 'UpdateRoomSuccess':
      return updateRoomSuccessHandler(msg.room, model)
  }
}

const linkPaginMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'LinkPaginMsg' }>['subMsg'],
  model: Model,
  networkOnline: boolean,
): [Model, Cmd<Msg>] => {
  const parent: ParentContext = {
    activeRoomId: undefined,
    expandedRoomIds: model.expandedRoomIds,
    dispatch: () => {},
  }
  const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
    Api.Room,
    ParentContext,
    RoomItemMsg,
    AppRoute
  >(networkOnline, logicConfig)(parent, subMsg, model.linkPagin)

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
      if (subMsg._tag === 'ChildMsg' && subMsg.subMsg._tag === 'ToggleExpand') {
        const nextExpanded = new Set(m.expandedRoomIds)
        if (nextExpanded.has(subMsg.childId)) {
          nextExpanded.delete(subMsg.childId)
        } else {
          nextExpanded.add(subMsg.childId)
        }
        return [{ ...m, expandedRoomIds: nextExpanded }, Cmd.none()]
      }
      return [m, Cmd.none()]
    }),
  )
}

const updateRoomSuccessHandler = (
  room: Api.Room,
  model: Model,
): [Model, Cmd<Msg>] => {
  const newLinkPagin = LinkPagination.updateByKey(
    logicConfig,
    room.id,
    () => room,
  )(model.linkPagin)

  return [{ ...model, linkPagin: newLinkPagin }, Cmd.none()]
}
