import type { Option } from 'fp-ts/lib/Option'

export type User = {
  readonly username: string
  readonly token: string
}

export type Shared = {
  readonly user: Option<User>
}
