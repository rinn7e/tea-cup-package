CREATE TABLE IF NOT EXISTS "app_user" (
    "slug" VARCHAR PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    "avatar" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL,
    "color" VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS "room" (
    "slug" VARCHAR PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    "topic" VARCHAR NOT NULL,
    "icon" VARCHAR NOT NULL,
    "unread_count" INT8 NOT NULL DEFAULT 0,
    "members_count" INT8 NOT NULL DEFAULT 0,
    "is_private" BOOLEAN NOT NULL DEFAULT FALSE,
    "order_index" INT8 NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "chat" (
    "slug" VARCHAR PRIMARY KEY,
    "room_id" VARCHAR NOT NULL REFERENCES "room"("slug") ON DELETE CASCADE,
    "author_id" VARCHAR NOT NULL REFERENCES "app_user"("slug") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "timestamp" INT8 NOT NULL,
    "is_starred" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_draft" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_unread" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS "idx_chat_room_timestamp" ON "chat" ("room_id", "timestamp" DESC);

CREATE TABLE IF NOT EXISTS "chat_reaction" (
    "id" BIGSERIAL PRIMARY KEY,
    "chat_slug" VARCHAR NOT NULL REFERENCES "chat"("slug") ON DELETE CASCADE,
    "emoji" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL REFERENCES "app_user"("slug") ON DELETE CASCADE,
    CONSTRAINT "unique_reaction" UNIQUE("chat_slug", "emoji", "user_id")
);

CREATE TABLE IF NOT EXISTS "draft" (
    "slug" VARCHAR PRIMARY KEY,
    "room_id" VARCHAR NOT NULL REFERENCES "room"("slug") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "updated_at" INT8 NOT NULL
);
