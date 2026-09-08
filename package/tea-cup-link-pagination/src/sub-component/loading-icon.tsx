import { type JSX } from 'react'

export const loadingIcon = (color: string, sizeInPx: number): JSX.Element => (
  <svg
    style={{ color, display: 'block' }}
    width={sizeInPx}
    height={sizeInPx}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M21 12a9 9 0 1 1-6.219-8.56' />
  </svg>
)
