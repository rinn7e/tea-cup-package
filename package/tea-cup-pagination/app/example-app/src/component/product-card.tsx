import { Heart, Star, Trash2 } from 'lucide-react'
import React from 'react'

import { type Product, type ProductMsg } from '../type'

type Props = {
  product: Product
  dispatch: (msg: ProductMsg) => void
}

export const ProductCard: React.FC<Props> = ({ product, dispatch }) => {
  return (
    <div
      data-test={`product-card-${product.id}`}
      data-category={product.category}
      className='group relative flex h-[270px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10'
    >
      <div>
        {/* Card Header: Category & Actions */}
        <div className='flex items-center justify-between gap-2 mb-3'>
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 capitalize'>
              {product.category}
            </span>
            {product.badge && (
              <span className='inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200'>
                {product.badge}
              </span>
            )}
          </div>

          <div className='flex items-center gap-1'>
            <button
              type='button'
              data-test={`favorite-btn-${product.id}`}
              aria-label={product.isFavorite ? 'Unfavorite' : 'Favorite'}
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ _tag: 'ToggleFavorite' })
              }}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                product.isFavorite
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${product.isFavorite ? 'fill-rose-500' : ''}`}
              />
            </button>

            <button
              type='button'
              data-test={`delete-btn-${product.id}`}
              aria-label='Delete product'
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ _tag: 'DeleteProduct' })
              }}
              className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600'
            >
              <Trash2 className='h-4 w-4' />
            </button>
          </div>
        </div>

        {/* Product Title */}
        <h3
          className='text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 cursor-pointer'
          onClick={() => dispatch({ _tag: 'SelectProduct' })}
        >
          {product.title}
        </h3>

        {/* Rating & Stock */}
        <div className='mt-1 flex items-center gap-3 text-xs text-slate-500'>
          <div className='flex items-center gap-1 text-amber-500 font-semibold'>
            <Star className='h-3.5 w-3.5 fill-amber-400' />
            <span>{product.rating.toFixed(1)}</span>
          </div>
          <span>•</span>
          <span
            className={
              product.stock < 10
                ? 'text-amber-600 font-medium'
                : 'text-slate-500'
            }
          >
            {product.stock} in stock
          </span>
        </div>

        {/* Description */}
        <p className='mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2'>
          {product.description}
        </p>
      </div>

      {/* Card Footer: Price & Details button */}
      <div className='mt-4 flex items-center justify-between border-t border-slate-100 pt-3'>
        <div>
          <span className='text-xs text-slate-400 block font-medium'>
            Price
          </span>
          <span
            data-test='product-price'
            className='text-lg font-extrabold text-slate-900'
          >
            ${product.price}
          </span>
        </div>

        <button
          type='button'
          data-test={`view-details-${product.id}`}
          onClick={() => dispatch({ _tag: 'SelectProduct' })}
          className='inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20'
        >
          Details
        </button>
      </div>
    </div>
  )
}
