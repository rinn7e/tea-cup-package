import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'

import { db } from '@/mock/products'

import { type HttpError, mkHttpError } from '../type/common'
import {
  type CategoryCountsResponse,
  type CategoryTab,
  type DeleteProductResponse,
  type ProductResponse,
  type ProductsResponse,
  type SortBy,
} from '../type/product'

export type GetProductsParams = {
  offset: number
  limit: number
  category?: CategoryTab
  query?: string
  sortBy?: SortBy
  simulateError?: boolean
  latencyMs?: number
}

/**
 * Endpoint: GET /api/products
 */
export const getProducts = (
  params: GetProductsParams,
): TE.TaskEither<HttpError<string>, ProductsResponse> => {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        if (params.simulateError) {
          resolve(
            E.left(
              mkHttpError(
                500,
                'Simulated API Error: Backend database temporarily unreachable. Click retry to reload.',
              ),
            ),
          )
          return
        }

        const res = db.query({
          offset: params.offset,
          limit: params.limit,
          category: params.category,
          searchQuery: params.query,
          sortBy: params.sortBy,
        })

        resolve(E.right(res))
      }, params.latencyMs ?? 0)
    })
}

/**
 * Endpoint: GET /api/products/:id
 */
export const getProduct = (
  id: string,
  latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, ProductResponse> => {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        const product = db.getById(id)
        if (!product) {
          resolve(
            E.left(mkHttpError(404, `Product with ID "${id}" was not found.`)),
          )
        } else {
          resolve(E.right({ product }))
        }
      }, latencyMs)
    })
}

/**
 * Endpoint: DELETE /api/products/:id
 */
export const deleteProduct = (
  id: string,
  latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, DeleteProductResponse> => {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        const success = db.delete(id)
        if (!success) {
          resolve(
            E.left(mkHttpError(404, `Product with ID "${id}" was not found.`)),
          )
        } else {
          resolve(E.right({ id }))
        }
      }, latencyMs)
    })
}

/**
 * Endpoint: POST /api/products/:id/favorite
 */
export const favoriteProduct = (
  id: string,
  latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, ProductResponse> => {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        const product = db.setFavorite(id, true)
        if (!product) {
          resolve(
            E.left(mkHttpError(404, `Product with ID "${id}" was not found.`)),
          )
        } else {
          resolve(E.right({ product }))
        }
      }, latencyMs)
    })
}

/**
 * Endpoint: DELETE /api/products/:id/favorite
 */
export const unfavoriteProduct = (
  id: string,
  latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, ProductResponse> => {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        const product = db.setFavorite(id, false)
        if (!product) {
          resolve(
            E.left(mkHttpError(404, `Product with ID "${id}" was not found.`)),
          )
        } else {
          resolve(E.right({ product }))
        }
      }, latencyMs)
    })
}

/**
 * Endpoint: POST /api/products/:id/toggle-favorite
 */
export const toggleFavoriteProduct = (
  id: string,
  latencyMs: number = 0,
): TE.TaskEither<HttpError<string>, ProductResponse> => {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        const product = db.toggleFavorite(id)
        if (!product) {
          resolve(
            E.left(mkHttpError(404, `Product with ID "${id}" was not found.`)),
          )
        } else {
          resolve(E.right({ product }))
        }
      }, latencyMs)
    })
}

/**
 * Endpoint: GET /api/categories/counts
 */
export const getCategoryCounts = (): TE.TaskEither<
  HttpError<string>,
  CategoryCountsResponse
> => {
  return () =>
    Promise.resolve(
      E.right({
        counts: db.getCategoryCounts(),
      }),
    )
}
