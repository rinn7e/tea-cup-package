import { Kysely, sql } from 'kysely'
import { WaSqliteWorkerDialect } from 'kysely-wasqlite-worker'

import * as DB from './schema'
import { type MyDB } from './type'

export * from './type'
export { resetDb } from './schema'

// The OPFS file name, and hence the Web Lock name the VFS contends on: one
// tab at a time can open it.
export const DB_FILE_NAME = 'link_pagination_example.db'

// Opens the local database (SQLite in a worker, stored in OPFS) and checks
// its schema. Without one (no OPFS, or another tab holds the file), the app
// runs with no cache: `null`.
export const initialize = async (): Promise<MyDB | null> => {
  const db: MyDB = new Kysely({
    dialect: new WaSqliteWorkerDialect({
      fileName: DB_FILE_NAME,
      preferOPFS: true,
    }),
  })

  try {
    // The first statement to reach the worker: it returns once the worker
    // started, the file opened and its lock was taken
    await sql`PRAGMA synchronous = NORMAL`.execute(db)
    const schema = await DB.ensureSchema(db)
    console.log('DB.initialize: ready, schema', schema)
    return db
  } catch (err) {
    console.warn('DB.initialize: no local database, running without cache', err)
    // Release the worker and its lock
    await db.destroy().catch(() => undefined)
    return null
  }
}
