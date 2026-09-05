import * as RD from '@devexperts/remote-data-ts'
import * as Pagination from '@rinn7e/tea-cup-pagination'
import { ArrayExtra, attemptTE, updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd, type Result } from 'tea-cup-fp'

import * as Api from './api'
import { mkPaginationConfig } from './helper'
import {
  type CategoryTab,
  type Model,
  type Msg,
  type Product,
  type ProductMsg,
  type SortBy,
} from './type'

export const init = (): [Model, Cmd<Msg>] => {
  const baseModel: Model = {
    pagination: {
      items: RD.initial,
      page: 1,
      pageAmount: 0,
    },
    categoryCounts: RD.pending,
    tab: 'all',
    searchQuery: '',
    sortBy: 'rating_desc',
    limit: 6,
    simulateError: false,
    simulateLatencyMs: 250,
    selectedProduct: null,
  }

  const config = mkPaginationConfig(baseModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  const model: Model = {
    ...baseModel,
    pagination,
  }

  return [
    model,
    Cmd.batch([
      paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
      fetchCategoryCountsCmd(),
    ]),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'GetCategoryCountsResponse':
      return getCategoryCountsResponseHandler(msg.result, model)
    case 'PaginationMsg':
      return paginationMsgHandler(msg.subMsg, model)
    case 'SetTab':
      return setTabHandler(msg.tab, model)
    case 'SetSearchQuery':
      return setSearchQueryHandler(msg.query, model)
    case 'SetSortBy':
      return setSortByHandler(msg.sortBy, model)
    case 'SetLimit':
      return setLimitHandler(msg.limit, model)
    case 'ToggleSimulateError':
      return toggleSimulateErrorHandler(model)
    case 'SetSimulateLatency':
      return setSimulateLatencyHandler(msg.latencyMs, model)
    case 'RetryFetch':
      return retryFetchHandler(model)
    case 'CloseModal':
      return closeModalHandler(model)
    case 'ResetFilters':
      return resetFiltersHandler(model)
    case 'NoOp':
      return [model, Cmd.none()]
  }
}

const fetchCategoryCountsCmd = (): Cmd<Msg> =>
  attemptTE(
    Api.getCategoryCounts(),
    (result): Msg => ({
      _tag: 'GetCategoryCountsResponse',
      result,
    }),
  )

const getCategoryCountsResponseHandler = (
  result: Result<Api.HttpError<string>, Api.CategoryCountsResponse>,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (result.tag === 'Ok') {
    return [
      { ...model, categoryCounts: RD.success(result.value.counts) },
      Cmd.none(),
    ]
  } else {
    return [{ ...model, categoryCounts: RD.failure(result.err) }, Cmd.none()]
  }
}

const paginationMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'PaginationMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const config = mkPaginationConfig(model, () => {})
  const [pagination, paginationCmd] = Pagination.update(config)(
    subMsg,
    model.pagination,
  )

  return pipe(
    [
      { ...model, pagination },
      paginationCmd.map(
        (m): Msg => ({
          _tag: 'PaginationMsg',
          subMsg: m,
        }),
      ),
    ] satisfies [Model, Cmd<Msg>],
    updateAndCmd((m) => {
      if (subMsg._tag === 'ItemMsg') {
        return paginationItemMsgHandler(subMsg.item, subMsg.msg)(m)
      } else {
        return [m, Cmd.none()]
      }
    }),
  )
}

const setTabHandler = (tab: CategoryTab, model: Model): [Model, Cmd<Msg>] => {
  if (tab === model.tab) {
    return [model, Cmd.none()]
  }
  const nextModel: Model = { ...model, tab }
  const config = mkPaginationConfig(nextModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  return [
    { ...nextModel, pagination },
    paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
  ]
}

const setSearchQueryHandler = (
  query: string,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (query === model.searchQuery) {
    return [model, Cmd.none()]
  }
  const nextModel: Model = { ...model, searchQuery: query }
  const config = mkPaginationConfig(nextModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  return [
    { ...nextModel, pagination },
    paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
  ]
}

const setSortByHandler = (sortBy: SortBy, model: Model): [Model, Cmd<Msg>] => {
  if (sortBy === model.sortBy) {
    return [model, Cmd.none()]
  }
  const nextModel: Model = { ...model, sortBy }
  const config = mkPaginationConfig(nextModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  return [
    { ...nextModel, pagination },
    paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
  ]
}

const setLimitHandler = (limit: number, model: Model): [Model, Cmd<Msg>] => {
  if (limit === model.limit) {
    return [model, Cmd.none()]
  }
  const nextModel: Model = { ...model, limit }
  const config = mkPaginationConfig(nextModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  return [
    { ...nextModel, pagination },
    paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
  ]
}

const toggleSimulateErrorHandler = (model: Model): [Model, Cmd<Msg>] => {
  const nextModel: Model = {
    ...model,
    simulateError: !model.simulateError,
  }

  if (nextModel.simulateError) {
    const config = mkPaginationConfig(nextModel, () => {})
    const [pagination, paginationCmd] = Pagination.init(
      config,
      model.pagination.page,
    )

    return [
      { ...nextModel, pagination },
      paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
    ]
  }

  return [nextModel, Cmd.none()]
}

const setSimulateLatencyHandler = (
  latencyMs: number,
  model: Model,
): [Model, Cmd<Msg>] => [{ ...model, simulateLatencyMs: latencyMs }, Cmd.none()]

const retryFetchHandler = (model: Model): [Model, Cmd<Msg>] => {
  const config = mkPaginationConfig(model, () => {})
  const [pagination, paginationCmd] = Pagination.init(
    config,
    model.pagination.page,
  )

  return [
    { ...model, pagination },
    paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
  ]
}

const closeModalHandler = (model: Model): [Model, Cmd<Msg>] => [
  { ...model, selectedProduct: null },
  Cmd.none(),
]

const resetFiltersHandler = (model: Model): [Model, Cmd<Msg>] => {
  const nextModel: Model = {
    ...model,
    tab: 'all',
    searchQuery: '',
    sortBy: 'rating_desc',
  }
  const config = mkPaginationConfig(nextModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  return [
    { ...nextModel, pagination },
    paginationCmd.map((m): Msg => ({ _tag: 'PaginationMsg', subMsg: m })),
  ]
}

const paginationItemMsgHandler =
  (item: Product, msg: ProductMsg) =>
  (m: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'ToggleFavorite': {
        const updatedProduct: Product = {
          ...item,
          isFavorite: !item.isFavorite,
        }

        const updatedSelected =
          m.selectedProduct && m.selectedProduct.id === item.id
            ? updatedProduct
            : m.selectedProduct

        const toggleCmd = attemptTE(
          Api.toggleFavoriteProduct(item.id),
          (result): Msg => ({
            _tag: 'PaginationMsg',
            subMsg: {
              _tag: 'ItemMsg',
              item,
              msg: { _tag: 'ToggleFavoriteResponse', result },
            },
          }),
        )

        if (m.pagination.items._tag === 'RemoteSuccess') {
          const articles = m.pagination.items.value
          return pipe(
            articles,
            A.findIndex((a) => a.id === item.id),
            O.fold(
              () => [
                {
                  ...m,
                  selectedProduct: updatedSelected,
                },
                toggleCmd,
              ],
              (index) => [
                {
                  ...m,
                  selectedProduct: updatedSelected,
                  pagination: {
                    ...m.pagination,
                    items: RD.success(
                      pipe(
                        articles,
                        ArrayExtra.modifyAtIfExist(index, () => updatedProduct),
                      ),
                    ),
                  },
                },
                toggleCmd,
              ],
            ),
          )
        }
        return [{ ...m, selectedProduct: updatedSelected }, toggleCmd]
      }

      case 'ToggleFavoriteResponse': {
        if (msg.result.tag === 'Ok') {
          const product = msg.result.value.product
          const updatedSelected =
            m.selectedProduct && m.selectedProduct.id === product.id
              ? product
              : m.selectedProduct

          if (m.pagination.items._tag === 'RemoteSuccess') {
            const articles = m.pagination.items.value
            return pipe(
              articles,
              A.findIndex((a) => a.id === product.id),
              O.fold(
                () => [
                  {
                    ...m,
                    selectedProduct: updatedSelected,
                  },
                  Cmd.none(),
                ],
                (index) => [
                  {
                    ...m,
                    selectedProduct: updatedSelected,
                    pagination: {
                      ...m.pagination,
                      items: RD.success(
                        pipe(
                          articles,
                          ArrayExtra.modifyAtIfExist(index, () => product),
                        ),
                      ),
                    },
                  },
                  Cmd.none(),
                ],
              ),
            )
          }
          return [{ ...m, selectedProduct: updatedSelected }, Cmd.none()]
        } else {
          // Revert optimistic update on failure
          const revertedProduct = { ...item, isFavorite: !item.isFavorite }
          const updatedSelected =
            m.selectedProduct && m.selectedProduct.id === item.id
              ? revertedProduct
              : m.selectedProduct

          if (m.pagination.items._tag === 'RemoteSuccess') {
            const articles = m.pagination.items.value
            return pipe(
              articles,
              A.findIndex((a) => a.id === item.id),
              O.fold(
                () => [
                  {
                    ...m,
                    selectedProduct: updatedSelected,
                  },
                  Cmd.none(),
                ],
                (index) => [
                  {
                    ...m,
                    selectedProduct: updatedSelected,
                    pagination: {
                      ...m.pagination,
                      items: RD.success(
                        pipe(
                          articles,
                          ArrayExtra.modifyAtIfExist(
                            index,
                            () => revertedProduct,
                          ),
                        ),
                      ),
                    },
                  },
                  Cmd.none(),
                ],
              ),
            )
          }
          return [{ ...m, selectedProduct: updatedSelected }, Cmd.none()]
        }
      }

      case 'DeleteProduct': {
        return [
          m,
          attemptTE(
            Api.deleteProduct(item.id),
            (result): Msg => ({
              _tag: 'PaginationMsg',
              subMsg: {
                _tag: 'ItemMsg',
                item,
                msg: { _tag: 'DeleteProductResponse', result },
              },
            }),
          ),
        ]
      }

      case 'DeleteProductResponse': {
        if (msg.result.tag === 'Ok') {
          const updatedSelected =
            m.selectedProduct && m.selectedProduct.id === item.id
              ? null
              : m.selectedProduct

          const nextModel: Model = {
            ...m,
            selectedProduct: updatedSelected,
          }

          const config = mkPaginationConfig(nextModel, () => {})
          const [pagination, paginationCmd] = Pagination.init(
            config,
            m.pagination.page,
          )

          return [
            { ...nextModel, pagination },
            Cmd.batch([
              paginationCmd.map(
                (subMsg): Msg => ({
                  _tag: 'PaginationMsg',
                  subMsg,
                }),
              ),
              fetchCategoryCountsCmd(),
            ]),
          ]
        }
        return [m, Cmd.none()]
      }

      case 'SelectProduct': {
        return [{ ...m, selectedProduct: item }, Cmd.none()]
      }
    }
  }
