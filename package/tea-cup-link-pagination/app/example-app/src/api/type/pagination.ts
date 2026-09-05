import * as t from 'io-ts'

export type Pagination<A> = {
  size: number
  total_count: number
  data: A[]
}

export const PaginationJson = <A>(aJson: t.Type<A>): t.Type<Pagination<A>> =>
  t.type({
    size: t.number,
    total_count: t.number,
    data: t.array(aJson),
  })

export const mkPagination = <A>(data: A[]): Pagination<A> => ({
  size: data.length,
  total_count: data.length,
  data,
})
