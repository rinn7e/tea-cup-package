import { sql } from 'kysely'

import * as DbChat from './chat'
import * as DbRoom from './room'
import { type MyDB } from './type'

// Bump when a table changes: the cache is rebuilt, empty, on the next start
const DB_SCHEMA_VERSION = 1

// The tables `initSchema` creates: the schema is whole only when all exist.
const tableNames = [DbChat.tableName, DbRoom.tableName]

// What `ensureSchema` found, and did about it:
// - `Ready`: the schema was whole, nothing done;
// - `Created`: none yet, or another schema version: rebuilt;
// - `Repaired`: the schema version matched, but tables were missing: rebuilt,
//   and the cached data is gone.
export type SchemaCheck = 'Ready' | 'Created' | 'Repaired'

// The schema version, kept in the database file itself (`user_version`), so
// it can't disagree with the tables it describes.
const readSchemaVersion = async (db: MyDB): Promise<number> => {
  const result = await sql<{
    user_version: number
  }>`PRAGMA user_version`.execute(db)
  return result.rows[0]?.user_version ?? 0
}

const readTableNames = async (db: MyDB): Promise<string[]> => {
  const result = await sql<{
    name: string
  }>`SELECT name FROM sqlite_master WHERE type = 'table'`.execute(db)
  return result.rows.map((row) => row.name)
}

// Drops and recreates every table and sets the schema version in one
// transaction: an interrupted rebuild leaves the old schema or the new one,
// never tables dropped but not recreated.
const rebuildSchema = async (db: MyDB): Promise<void> => {
  await db.transaction().execute(async (trx) => {
    await dropAllTables(trx)
    await initSchema(trx)
    await sql`PRAGMA user_version = ${sql.lit(DB_SCHEMA_VERSION)}`.execute(trx)
  })
}

// Start: rebuilds the schema when its version changed or a table is missing.
export const ensureSchema = async (db: MyDB): Promise<SchemaCheck> => {
  const version = await readSchemaVersion(db)
  if (version !== DB_SCHEMA_VERSION) {
    await rebuildSchema(db)
    return 'Created'
  } else {
    const existing = await readTableNames(db)
    if (tableNames.every((name) => existing.includes(name))) {
      return 'Ready'
    } else {
      await rebuildSchema(db)
      return 'Repaired'
    }
  }
}

// Delete all database table
export const dropAllTables = async (db: MyDB) => {
  await db.schema.dropTable(DbChat.tableName).ifExists().execute()
  await db.schema.dropTable(DbRoom.tableName).ifExists().execute()
}

// Initialize database's table
export const initSchema = async (db: MyDB) => {
  await DbChat.initSchema(db)
  await DbRoom.initSchema(db)
}

// Delete all the data in all the table (the "Clear Cache & Reset" action)
export const resetDb = async (db: MyDB) => {
  await db.deleteFrom(DbChat.tableName).execute()
  await db.deleteFrom(DbRoom.tableName).execute()
}
