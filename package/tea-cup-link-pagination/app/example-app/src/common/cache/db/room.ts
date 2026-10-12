import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { type Insertable } from 'kysely'

import {
  type Pagination,
  type Room,
  type RoomCurrentPrevNextResult,
  mkPagination,
} from '../../../api/type'
import { type MyDB, type RoomsTable } from './type'

export const tableName = 'rooms'

export const initSchema = async (db: MyDB) => {
  await db.schema
    .createTable(tableName)
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('last_message_timestamp', 'integer', (col) => col.notNull())
    .addColumn('data', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('room_index_last_message_timestamp')
    .ifNotExists()
    .on(tableName)
    .column('last_message_timestamp')
    .execute()
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

// Prepare data to be put into insert query
const dataToRow = (data: Room): Insertable<RoomsTable> => ({
  id: data.id,
  last_message_timestamp: data.lastMessage?.timestamp ?? 0,
  data: JSON.stringify(data),
})

// The json column comes back as text
const rowToData = (row: { data: Room | string }): Room =>
  typeof row.data === 'string' ? JSON.parse(row.data) : row.data

// ------------------------------------------------------------
// Create, update, delete
// ------------------------------------------------------------

export const create = async (db: MyDB, data: Room): Promise<void> =>
  createMany(db, [data])

export const createMany = async (db: MyDB, datas: Room[]): Promise<void> => {
  if (datas.length === 0) return

  // Filter unique data only
  const rows = pipe(
    datas,
    A.uniq({ equals: (x: Room, y: Room) => x.id === y.id }),
    A.map(dataToRow),
  )
  const query = db
    .insertInto(tableName)
    .values(rows)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        last_message_timestamp: eb.ref('excluded.last_message_timestamp'),
        data: eb.ref('excluded.data'),
      })),
    )

  try {
    await query.execute()
  } catch (err) {
    console.warn(err)
  }
}

export const deleteMany = async (
  db: MyDB,
  roomIds: string[],
): Promise<void> => {
  if (roomIds.length === 0) return

  try {
    await db.deleteFrom(tableName).where('id', 'in', roomIds).execute()
  } catch (err) {
    console.warn(err)
  }
}

// ------------------------------------------------------------
// Read operation
// ------------------------------------------------------------

// A page of rooms, read like `GET /api/rooms`: the most recently active, the
// ones whose last message is older than `beforeTimestamp`, or newer than
// `afterTimestamp`, nearest first.
export const read = async (param: {
  db: MyDB
  beforeTimestamp?: number
  afterTimestamp?: number
  pageSize: number
}): Promise<Pagination<Room>> => {
  const { db, beforeTimestamp, afterTimestamp, pageSize } = param

  const sortOrder = afterTimestamp !== undefined ? 'asc' : 'desc'

  let query = db.selectFrom(tableName).select('data')

  if (beforeTimestamp !== undefined) {
    query = query.where('last_message_timestamp', '<', beforeTimestamp)
  }

  if (afterTimestamp !== undefined) {
    query = query.where('last_message_timestamp', '>', afterTimestamp)
  }

  try {
    const rows = await query
      .orderBy('last_message_timestamp', sortOrder)
      .orderBy('id', sortOrder)
      .limit(pageSize)
      .execute()
    return mkPagination(pipe(rows, A.map(rowToData)))
  } catch (err) {
    console.warn(err)
    return mkPagination([])
  }
}

export const readOne = async (
  db: MyDB,
  roomId: string,
): Promise<Room | null> => {
  try {
    const row = await db
      .selectFrom(tableName)
      .select('data')
      .where('id', '=', roomId)
      .executeTakeFirst()
    return row ? rowToData(row) : null
  } catch (err) {
    console.warn(err)
    return null
  }
}

// The room `roomId` with a page on each side, read like
// `GET /api/rooms/current_prev_next`; nothing when it isn't cached
export const readCurrentPrevNext = async (
  db: MyDB,
  roomId: string,
  pageSize: number,
): Promise<RoomCurrentPrevNextResult | null> => {
  const current = await readOne(db, roomId)
  if (current) {
    const timestamp = current.lastMessage?.timestamp ?? 0
    const [prev, next] = await Promise.all([
      read({ db, beforeTimestamp: timestamp, pageSize }),
      read({ db, afterTimestamp: timestamp, pageSize }),
    ])
    return [current, prev, next]
  } else return null
}
