import * as t from 'io-ts'

export type Pagination<Item> = {
  size: number
  total_count: number
  data: Item[]
}

export const PaginationJson = <Item>(
  aJson: t.Type<Item>,
): t.Type<Pagination<Item>> =>
  t.type({
    size: t.number,
    total_count: t.number,
    data: t.array(aJson),
  })

export const mkPagination = <Item>(data: Item[]): Pagination<Item> => ({
  size: data.length,
  total_count: data.length,
  data,
})
