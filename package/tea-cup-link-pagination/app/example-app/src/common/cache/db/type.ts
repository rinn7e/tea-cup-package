import { type ColumnType, type Kysely } from 'kysely'

import { type Chat, type Room } from '../../../api/type'

export type ChatsTable = {
  id: string
  room_id: string
  timestamp: number
  data: ColumnType<Chat, string, string> // json column
}

export type RoomsTable = {
  id: string
  // A room without a last message sorts as the oldest (0)
  last_message_timestamp: number
  data: ColumnType<Room, string, string> // json column
}

export type Database = {
  chats: ChatsTable
  rooms: RoomsTable
}

export type MyDB = Kysely<Database>
