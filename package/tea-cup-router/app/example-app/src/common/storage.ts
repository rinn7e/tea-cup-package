import * as O from 'fp-ts/lib/Option'

import type { User } from './shared'

const STORAGE_KEY = 'tea_cup_router_demo_user'

export const getStoredUser = (): O.Option<User> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return O.none
    return O.some(JSON.parse(raw))
  } catch {
    return O.none
  }
}

export const saveStoredUser = (user: User) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export const removeStoredUser = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
