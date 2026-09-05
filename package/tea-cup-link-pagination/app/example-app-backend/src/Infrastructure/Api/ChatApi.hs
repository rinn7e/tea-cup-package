{-# LANGUAGE OverloadedRecordDot #-}
{-# LANGUAGE OverloadedStrings #-}

module Infrastructure.Api.ChatApi
  ( ChatApi
  , chatServer
  , toChatDTO
  , getChatById
  ) where

import Control.Monad (forM)
import Control.Monad.IO.Class (liftIO)
import Data.Int (Int64)
import Data.List (groupBy, sortOn)
import Data.Maybe (fromMaybe, listToMaybe)
import Data.Text (Text)
import Data.Text qualified as T
import Data.Time.Clock.POSIX (getPOSIXTime)
import Database.Persist
import Database.Persist.Sql (ConnectionPool, SqlPersistT, runSqlPool)
import Domain.Type.Chat
  ( ChatDTO (..)
  , ReactionDTO (..)
  , SendChatPayload (..)
  , ToggleReactionPayload (..)
  )
import Domain.Type.Page (Page (..))
import Domain.Type.User (UserDTO (..))
import Infrastructure.Api.UserApi (getUserById)
import Infrastructure.Interpreter.Real.DB.Schema.Schema
import Servant

type ChatApi =
       "api" :> "rooms" :> Capture "roomId" Text :> "chats"
             :> QueryParam "page_size" Int
             :> QueryParam "after_timestamp" Int64
             :> QueryParam "before_timestamp" Int64
             :> Get '[JSON] (Page ChatDTO)
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "chats" :> "one" :> Capture "chatId" Text :> Get '[JSON] (Maybe ChatDTO)
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "chats" :> "current_prev_next"
             :> QueryParam' '[Required, Strict] "chat_id" Text
             :> QueryParam "page_size" Int
             :> Get '[JSON] (Maybe (ChatDTO, Page ChatDTO, Page ChatDTO))
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "chats" :> ReqBody '[JSON] SendChatPayload :> Post '[JSON] ChatDTO
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "chats" :> Capture "chatId" Text :> "reactions" :> ReqBody '[JSON] ToggleReactionPayload :> Post '[JSON] ChatDTO
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "chats" :> Capture "chatId" Text :> "star" :> Post '[JSON] ChatDTO
  :<|> "api" :> "chats" :> "search" :> QueryParam' '[Required, Strict] "query" Text :> QueryParam "room_id" Text :> Get '[JSON] [ChatDTO]

chatServer :: ConnectionPool -> Server ChatApi
chatServer pool =
       getChatsHandler pool
  :<|> getChatOneHandler pool
  :<|> getChatCurrentPrevNextHandler pool
  :<|> sendChatHandler pool
  :<|> toggleReactionHandler pool
  :<|> toggleStarHandler pool
  :<|> searchChatsHandler pool

toChatDTO :: Entity Chat -> SqlPersistT IO ChatDTO
toChatDTO (Entity (ChatKey cId) c) = do
  mbAuthor <- getUserById c.chatAuthorId
  let authorDTO = fromMaybe (UserDTO c.chatAuthorId "Unknown" "" "dev" "text-gray-500") mbAuthor

  reactionEnts <- selectList [ChatReactionChatSlug ==. cId] []
  let rawReactions = [r | Entity _ r <- reactionEnts]
      grouped = groupBy (\a b -> a.chatReactionEmoji == b.chatReactionEmoji) (sortOn (.chatReactionEmoji) rawReactions)
      reactionDTOs =
        [ ReactionDTO
            { emoji = firstR.chatReactionEmoji
            , count = length (firstR : restR)
            , userIds = map (.chatReactionUserId) (firstR : restR)
            }
        | (firstR : restR) <- grouped
        ]

  pure ChatDTO
    { id = cId
    , roomId = c.chatRoomId
    , author = authorDTO
    , content = c.chatContent
    , timestamp = c.chatTimestamp
    , reactions = reactionDTOs
    , isStarred = c.chatIsStarred
    , isDraft = c.chatIsDraft
    , isUnread = c.chatIsUnread
    }

getChatById :: Text -> SqlPersistT IO (Maybe ChatDTO)
getChatById cId = do
  mbEnt <- get (ChatKey cId)
  case mbEnt of
    Nothing -> pure Nothing
    Just c -> Just <$> toChatDTO (Entity (ChatKey cId) c)

getChatsHandler :: ConnectionPool -> Text -> Maybe Int -> Maybe Int64 -> Maybe Int64 -> Handler (Page ChatDTO)
getChatsHandler pool rId mbPageSize mbAfter mbBefore = liftIO $ runSqlPool (do
  let pageSize = fromMaybe 15 mbPageSize
  totalCount <- count [ChatRoomId ==. rId, ChatIsDraft ==. False]
  case (mbAfter, mbBefore) of
    (Just afterTs, _) -> do
      chatEnts <- selectList [ChatRoomId ==. rId, ChatIsDraft ==. False, ChatTimestamp >. afterTs] [Asc ChatTimestamp, LimitTo pageSize]
      chats <- forM chatEnts toChatDTO
      pure Page { pageSize = pageSize, pageTotalCount = totalCount, pageData = chats }
    (_, Just beforeTs) -> do
      chatEnts <- selectList [ChatRoomId ==. rId, ChatIsDraft ==. False, ChatTimestamp <. beforeTs] [Desc ChatTimestamp, LimitTo pageSize]
      chats <- forM (reverse chatEnts) toChatDTO
      pure Page { pageSize = pageSize, pageTotalCount = totalCount, pageData = chats }
    (Nothing, Nothing) -> do
      chatEnts <- selectList [ChatRoomId ==. rId, ChatIsDraft ==. False] [Desc ChatTimestamp, LimitTo pageSize]
      chats <- forM (reverse chatEnts) toChatDTO
      pure Page { pageSize = pageSize, pageTotalCount = totalCount, pageData = chats }
  ) pool

getChatOneHandler :: ConnectionPool -> Text -> Text -> Handler (Maybe ChatDTO)
getChatOneHandler pool _rId cId = liftIO $ runSqlPool (getChatById cId) pool

getChatCurrentPrevNextHandler :: ConnectionPool -> Text -> Text -> Maybe Int -> Handler (Maybe (ChatDTO, Page ChatDTO, Page ChatDTO))
getChatCurrentPrevNextHandler pool rId cId mbPageSize = liftIO $ runSqlPool (do
  let pageSize = fromMaybe 15 mbPageSize
  mbFocus <- getChatById cId
  case mbFocus of
    Nothing -> pure Nothing
    Just focus -> do
      let focusTs = focus.timestamp
      prevEnts <- selectList [ChatRoomId ==. rId, ChatIsDraft ==. False, ChatTimestamp <. focusTs] [Desc ChatTimestamp, LimitTo pageSize]
      prevCount <- count [ChatRoomId ==. rId, ChatIsDraft ==. False, ChatTimestamp <. focusTs]
      prevChats <- forM (reverse prevEnts) toChatDTO

      nextEnts <- selectList [ChatRoomId ==. rId, ChatIsDraft ==. False, ChatTimestamp >. focusTs] [Asc ChatTimestamp, LimitTo pageSize]
      nextCount <- count [ChatRoomId ==. rId, ChatIsDraft ==. False, ChatTimestamp >. focusTs]
      nextChats <- forM nextEnts toChatDTO

      let prevPage = Page { pageSize = pageSize, pageTotalCount = prevCount, pageData = prevChats }
          nextPage = Page { pageSize = pageSize, pageTotalCount = nextCount, pageData = nextChats }
      pure $ Just (focus, prevPage, nextPage)
  ) pool

sendChatHandler :: ConnectionPool -> Text -> SendChatPayload -> Handler ChatDTO
sendChatHandler pool rId payload = do
  nowMs <- liftIO $ round . (* 1000) <$> getPOSIXTime
  mbChat <- liftIO $ runSqlPool (do
    -- Get latest timestamp in room to avoid collision
    latestChat <- selectList [ChatRoomId ==. rId] [Desc ChatTimestamp, LimitTo 1]
    let lastTs = maybe 0 (\(Entity _ c) -> c.chatTimestamp) (listToMaybe latestChat)
        uniqueTs = max nowMs (lastTs + 1)
        chatSlug = "message-" <> T.pack (show uniqueTs)
        author = fromMaybe "user-master" payload.authorId
        isUnread = author /= "user-master"

    let newChat = Chat
          { chatSlug = chatSlug
          , chatRoomId = rId
          , chatAuthorId = author
          , chatContent = payload.content
          , chatTimestamp = uniqueTs
          , chatIsStarred = False
          , chatIsDraft = False
          , chatIsUnread = isUnread
          }

    insert_ newChat
    getChatById chatSlug
    ) pool
  case mbChat of
    Just c -> pure c
    Nothing -> throwError err500 { errBody = "Failed to create message" }

toggleReactionHandler :: ConnectionPool -> Text -> Text -> ToggleReactionPayload -> Handler ChatDTO
toggleReactionHandler pool _rId cId payload = do
  mbChat <- liftIO $ runSqlPool (do
    existing <- selectList [ChatReactionChatSlug ==. cId, ChatReactionEmoji ==. payload.emoji, ChatReactionUserId ==. payload.userId] []
    case existing of
      (Entity k _ : _) -> delete k
      [] -> insert_ (ChatReaction cId payload.emoji payload.userId)
    getChatById cId
    ) pool
  case mbChat of
    Just c -> pure c
    Nothing -> throwError err404 { errBody = "Chat not found" }

toggleStarHandler :: ConnectionPool -> Text -> Text -> Handler ChatDTO
toggleStarHandler pool _rId cId = do
  mbChat <- liftIO $ runSqlPool (do
    mbEnt <- get (ChatKey cId)
    case mbEnt of
      Just c -> do
        update (ChatKey cId) [ChatIsStarred =. not (c.chatIsStarred)]
        getChatById cId
      Nothing -> pure Nothing
    ) pool
  case mbChat of
    Just c -> pure c
    Nothing -> throwError err404 { errBody = "Chat not found" }

searchChatsHandler :: ConnectionPool -> Text -> Maybe Text -> Handler [ChatDTO]
searchChatsHandler pool query mbRoomId = liftIO $ runSqlPool (do
  let q = T.toLower (T.strip query)
  allChatEnts <- case mbRoomId of
    Just rId -> selectList [ChatRoomId ==. rId, ChatIsDraft ==. False] [Desc ChatTimestamp]
    Nothing -> selectList [ChatIsDraft ==. False] [Desc ChatTimestamp]
  allChats <- forM allChatEnts toChatDTO
  let filtered = filter (\c -> q `T.isInfixOf` T.toLower c.content || q `T.isInfixOf` T.toLower c.author.name) allChats
  pure (take 10 filtered)
  ) pool
