import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type AppRoute, toUrlString } from '@/common/type/route'
import type { Msg } from '@/type'

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  key?: React.Key
  route: AppRoute
  className?: string
  children: React.ReactNode
  setGlobalMsg: Dispatcher<Msg>
}

export const linkView = ({
  key,
  route,
  className,
  children,
  setGlobalMsg,
  ...rest
}: Props): React.ReactElement => {
  const href = toUrlString(route)

  return (
    <a
      key={key}
      {...rest}
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        setGlobalMsg({ _tag: 'ChangeRoute', route })
      }}
    >
      {children}
    </a>
  )
}
