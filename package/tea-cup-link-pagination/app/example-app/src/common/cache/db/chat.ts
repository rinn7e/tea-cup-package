import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { type Insertable } from 'kysely'

import {
  type Chat,
  type ChatCurrentPrevNextResult,
  type Pagination,
  mkPagination,
} from '../../../api/type'
import { type ChatsTable, type MyDB } from './type'

export const tableName = 'chats'

export const initSchema = async (db: MyDB) => {
  await db.schema
    .createTable(tableName)
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('room_id', 'text', (col) => col.notNull())
    .addColumn('timestamp', 'integer', (col) => col.notNull())
    .addColumn('data', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('chat_index_room_id_timestamp')
    .ifNotExists()
    .on(tableName)
    .columns(['room_id', 'timestamp'])
    .execute()
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

// Prepare data to be put into insert query
const dataToRow = (data: Chat): Insertable<ChatsTable> => ({
  id: data.id,
  room_id: data.roomId,
  timestamp: data.timestamp,
  data: JSON.stringify(data),
})

// The json column comes back as text
const rowToData = (row: { data: Chat | string }): Chat =>
  typeof row.data === 'string' ? JSON.parse(row.data) : row.data

// ------------------------------------------------------------
// Create, update, delete
// ------------------------------------------------------------

export const create = async (db: MyDB, data: Chat): Promise<void> =>
  createMany(db, [data])

export const createMany = async (db: MyDB, datas: Chat[]): Promise<void> => {
  if (datas.length === 0) return

  // Filter unique data only
  const rows = pipe(
    datas,
    A.uniq({ equals: (x: Chat, y: Chat) => x.id === y.id }),
    A.map(dataToRow),
  )
  const query = db
    .insertInto(tableName)
    .values(rows)
    .onConflict((oc) =>
      oc.column('id').doUpdateSet((eb) => ({
        room_id: eb.ref('excluded.room_id'),
        timestamp: eb.ref('excluded.timestamp'),
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
  chatIds: string[],
): Promise<void> => {
  if (chatIds.length === 0) return

  try {
    await db.deleteFrom(tableName).where('id', 'in', chatIds).execute()
  } catch (err) {
    console.warn(err)
  }
}

export const deleteByRoom = async (db: MyDB, roomId: string): Promise<void> => {
  try {
    await db.deleteFrom(tableName).where('room_id', '=', roomId).execute()
  } catch (err) {
    console.warn(err)
  }
}

// ------------------------------------------------------------
// Read operation
// ------------------------------------------------------------

// A page of a room's chats, read like `GET /api/rooms/:roomId/chats`: the
// newest, the ones older than `beforeTimestamp`, or the ones newer than
// `afterTimestamp`, nearest first.
export const read = async (param: {
  db: MyDB
  roomId: string
  beforeTimestamp?: number
  afterTimestamp?: number
  pageSize: number
}): Promise<Pagination<Chat>> => {
  const { db, roomId, beforeTimestamp, afterTimestamp, pageSize } = param

  const sortOrder = afterTimestamp !== undefined ? 'asc' : 'desc'

  let query = db
    .selectFrom(tableName)
    .select('data')
    .where('room_id', '=', roomId)

  if (beforeTimestamp !== undefined) {
    query = query.where('timestamp', '<', beforeTimestamp)
  }

  if (afterTimestamp !== undefined) {
    query = query.where('timestamp', '>', afterTimestamp)
  }

  try {
    const rows = await query
      .orderBy('timestamp', sortOrder)
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
  chatId: string,
): Promise<Chat | null> => {
  try {
    const row = await db
      .selectFrom(tableName)
      .select('data')
      .where('room_id', '=', roomId)
      .where('id', '=', chatId)
      .executeTakeFirst()
    return row ? rowToData(row) : null
  } catch (err) {
    console.warn(err)
    return null
  }
}

// The chat `chatId` with a page on each side, read like
// `GET /api/rooms/:roomId/chats/current_prev_next`; nothing when it isn't
// cached
export const readCurrentPrevNext = async (
  db: MyDB,
  roomId: string,
  chatId: string,
  pageSize: number,
): Promise<ChatCurrentPrevNextResult | null> => {
  const current = await readOne(db, roomId, chatId)
  if (current) {
    const [prev, next] = await Promise.all([
      read({ db, roomId, beforeTimestamp: current.timestamp, pageSize }),
      read({ db, roomId, afterTimestamp: current.timestamp, pageSize }),
    ])
    return [current, prev, next]
  } else return null
}
