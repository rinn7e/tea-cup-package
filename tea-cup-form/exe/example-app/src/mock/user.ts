import type * as Form from '@rinn7e/tea-cup-form'
import { errorToString } from '@rinn7e/tea-cup-prelude'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'

export type MockUser = { id: string; name: string; email: string }

export const mockUsers: MockUser[] = [
  { id: 'u1', name: 'Alice Smith', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob Jones', email: 'bob@example.com' },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com' },
  { id: 'u4', name: 'Diana Prince', email: 'diana@example.com' },
  { id: 'u5', name: 'Evan Wright', email: 'evan@example.com' },
]

export const encodeUser = (u: MockUser): Form.DataJson =>
  JSON.stringify(u) as Form.DataJson

export const decodeUser = (s: Form.DataJson): MockUser =>
  JSON.parse(s)

export const mockUserSearchHandler: (
  query: string,
) => TE.TaskEither<Error, MockUser[]> = (query: string) =>
  TE.tryCatch(
    async () => {
      await new Promise((res) => setTimeout(res, 200))
      const q = query.toLowerCase()
      return mockUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    },
    (reason) => new Error(String(reason)),
  )

export const convertMockUserSearchHandler =
  (
    handler: (query: string) => TE.TaskEither<Error, MockUser[]>,
  ): ((query: string) => TE.TaskEither<Form.ErrorJson, Form.DataJson[]>) =>
  (query: string) =>
    pipe(
      handler(query),
      TE.mapLeft((err) => errorToString(err) as Form.ErrorJson),
      TE.map((users) => users.map(encodeUser)),
    )
