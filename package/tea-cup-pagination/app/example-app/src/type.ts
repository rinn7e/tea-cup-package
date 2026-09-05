import * as RD from '@devexperts/remote-data-ts'
import * as Pagination from '@rinn7e/tea-cup-pagination'
import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { type Result } from 'tea-cup-fp'

import {
  CATEGORY_TABS,
  type Category,
  type CategoryCountsResponse,
  type CategoryTab,
  type DeleteProductResponse,
  type HttpError,
  LIMIT_OPTIONS,
  type Product,
  ProductEq,
  type ProductResponse,
  SORT_OPTIONS,
  type SortBy,
  isSortBy,
} from './api'

export type { Category, CategoryTab, Product, SortBy }
export { CATEGORY_TABS, LIMIT_OPTIONS, ProductEq, SORT_OPTIONS, isSortBy }

export type ProductMsg =
  | { _tag: 'ToggleFavorite' }
  | {
      _tag: 'ToggleFavoriteResponse'
      result: Result<HttpError<string>, ProductResponse>
    }
  | { _tag: 'DeleteProduct' }
  | {
      _tag: 'DeleteProductResponse'
      result: Result<HttpError<string>, DeleteProductResponse>
    }
  | { _tag: 'SelectProduct' }

export type Model = {
  pagination: Pagination.Model<Product, string>
  categoryCounts: RD.RemoteData<HttpError<string>, Record<CategoryTab, number>>
  tab: CategoryTab
  searchQuery: string
  sortBy: SortBy
  limit: number
  simulateError: boolean
  simulateLatencyMs: number
  selectedProduct: Product | null
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  pagination: Pagination.mkModelEq(ProductEq, S.Eq),
  categoryCounts: EqAlways,
  tab: S.Eq,
  searchQuery: S.Eq,
  sortBy: S.Eq,
  limit: N.Eq,
  simulateError: B.Eq,
  simulateLatencyMs: N.Eq,
  selectedProduct: EqAlways,
})

export type Msg =
  | {
      _tag: 'PaginationMsg'
      subMsg: Pagination.Msg<Product, ProductMsg, string>
    }
  | {
      _tag: 'GetCategoryCountsResponse'
      result: Result<HttpError<string>, CategoryCountsResponse>
    }
  | { _tag: 'SetTab'; tab: CategoryTab }
  | { _tag: 'SetSearchQuery'; query: string }
  | { _tag: 'SetSortBy'; sortBy: SortBy }
  | { _tag: 'SetLimit'; limit: number }
  | { _tag: 'ToggleSimulateError' }
  | { _tag: 'SetSimulateLatency'; latencyMs: number }
  | { _tag: 'RetryFetch' }
  | { _tag: 'CloseModal' }
  | { _tag: 'ResetFilters' }
  | { _tag: 'NoOp' }
