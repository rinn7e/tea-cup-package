import { Heart, Star, X } from 'lucide-react'
import React from 'react'

import { type Product } from '../type'

type Props = {
  product: Product | null
  onClose: () => void
  onToggleFavorite: () => void
}

export const ProductModal: React.FC<Props> = ({
  product,
  onClose,
  onToggleFavorite,
}) => {
  if (!product) {
    return null
  }

  return (
    <div
      data-test='product-modal-backdrop'
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4'
      onClick={onClose}
    >
      <div
        data-test='product-modal-content'
        className='relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type='button'
          data-test='modal-close-btn'
          aria-label='Close dialog'
          onClick={onClose}
          className='absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
        >
          <X className='h-4 w-4' />
        </button>

        <div className='flex items-center gap-2 mb-3'>
          <span className='inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 capitalize'>
            {product.category}
          </span>
          {product.badge && (
            <span className='inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200'>
              {product.badge}
            </span>
          )}
        </div>

        <h2 className='text-xl font-extrabold text-slate-900'>
          {product.title}
        </h2>

        <div className='mt-2 flex items-center gap-4 text-xs text-slate-500'>
          <div className='flex items-center gap-1 text-amber-500 font-bold'>
            <Star className='h-4 w-4 fill-amber-400' />
            <span>{product.rating.toFixed(1)} / 5.0</span>
          </div>
          <span>•</span>
          <span className='font-medium text-emerald-600'>
            {product.stock} units available
          </span>
          <span>•</span>
          <span className='font-mono text-slate-400'>SKU: {product.id}</span>
        </div>

        <div className='mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-100'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-slate-400'>
            Description
          </h4>
          <p className='mt-1 text-sm text-slate-700 leading-relaxed'>
            {product.description}
          </p>
        </div>

        <div className='mt-6 flex items-center justify-between border-t border-slate-100 pt-4'>
          <div>
            <span className='text-xs text-slate-400 block font-medium'>
              Price
            </span>
            <span className='text-2xl font-black text-slate-900'>
              ${product.price}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              data-test='modal-favorite-btn'
              onClick={onToggleFavorite}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
                product.isFavorite
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${product.isFavorite ? 'fill-rose-500' : ''}`}
              />
              <span>
                {product.isFavorite ? 'Favorited' : 'Add to Wishlist'}
              </span>
            </button>

            <button
              type='button'
              data-test='modal-close-footer-btn'
              onClick={onClose}
              className='rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800'
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
