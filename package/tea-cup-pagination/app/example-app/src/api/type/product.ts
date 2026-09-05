import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

export type Category =
  | 'electronics'
  | 'audio'
  | 'photography'
  | 'gaming'
  | 'wearables'

export type Product = {
  id: string
  title: string
  category: Category
  price: number
  rating: number
  stock: number
  description: string
  isFavorite: boolean
  badge?: string
}

export type CategoryTab = 'all' | Category

export const CATEGORY_TABS: { id: CategoryTab; label: string }[] = [
  { id: 'all', label: 'All Products' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'audio', label: 'Audio & Sound' },
  { id: 'photography', label: 'Photography' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'wearables', label: 'Wearables' },
]

export type SortBy = 'price_asc' | 'price_desc' | 'rating_desc' | 'title_asc'

export const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'rating_desc', label: 'Highest Rated' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'title_asc', label: 'Name (A-Z)' },
]

export const isSortBy = (val: string): val is SortBy =>
  SORT_OPTIONS.some((opt) => opt.id === val)

export const LIMIT_OPTIONS = [6, 12, 24] as const

export const ProductEq: EqClass.Eq<Product> = EqClass.struct<Product>({
  id: S.Eq,
  title: S.Eq,
  category: S.Eq,
  price: N.Eq,
  rating: N.Eq,
  stock: N.Eq,
  description: S.Eq,
  isFavorite: B.Eq,
  badge: EqAlways,
})

export type ProductsResponse = {
  items: Product[]
  totalCount: number
}

export const ProductsResponseEq: EqClass.Eq<ProductsResponse> =
  EqClass.struct<ProductsResponse>({
    items: A.getEq(ProductEq),
    totalCount: N.Eq,
  })

export type ProductResponse = {
  product: Product
}

export const ProductResponseEq: EqClass.Eq<ProductResponse> =
  EqClass.struct<ProductResponse>({
    product: ProductEq,
  })

export type DeleteProductResponse = {
  id: string
}

export type CategoryCountsResponse = {
  counts: Record<CategoryTab, number>
}
