{-# LANGUAGE OverloadedRecordDot #-}
{-# LANGUAGE OverloadedStrings #-}

module Infrastructure.Api.RoomApi
  ( RoomApi
  , roomServer
  , toRoomDTO
  , getRoomById
  ) where

import Control.Monad (forM)
import Control.Monad.IO.Class (liftIO)
import Data.Int (Int64)
import Data.List (sortOn)
import Data.Maybe (fromMaybe, listToMaybe)
import Data.Ord (Down (..))
import Data.Text (Text)
import Data.Text qualified as T
import Database.Persist
import Database.Persist.Sql (ConnectionPool, SqlPersistT, runSqlPool)
import Domain.Type.Page (Page (..))
import Domain.Type.Room (LastMessagePreviewDTO (..), RoomDTO (..))
import Infrastructure.Interpreter.Real.DB.Schema.Schema
import Servant

type RoomApi =
       "api" :> "rooms"
             :> QueryParam "page_size" Int
             :> QueryParam "after_timestamp" Int64
             :> QueryParam "before_timestamp" Int64
             :> QueryParam "search_string" Text
             :> Get '[JSON] (Page RoomDTO)
  :<|> "api" :> "rooms" :> "one" :> Capture "roomId" Text :> Get '[JSON] (Maybe RoomDTO)
  :<|> "api" :> "rooms" :> "current_prev_next"
             :> QueryParam' '[Required, Strict] "room_id" Text
             :> QueryParam "page_size" Int
             :> Get '[JSON] (Maybe (RoomDTO, Page RoomDTO, Page RoomDTO))

roomServer :: ConnectionPool -> Server RoomApi
roomServer pool =
       getRoomsHandler pool
  :<|> getRoomOneHandler pool
  :<|> getRoomCurrentPrevNextHandler pool

toRoomDTO :: Entity Room -> SqlPersistT IO RoomDTO
toRoomDTO (Entity (RoomKey rId) r) = do
  -- Get all non-draft chats for this room ordered by timestamp
  chats <- selectList [ChatRoomId ==. rId, ChatIsDraft ==. False] [Asc ChatTimestamp]

  let lastChat = listToMaybe (reverse chats)
  lastMessageDTO <- case lastChat of
    Nothing -> pure Nothing
    Just (Entity _ c) -> do
      mbAuthor <- get (AppUserKey c.chatAuthorId)
      let authorName = maybe "Unknown" (.appUserName) mbAuthor
      pure $ Just LastMessagePreviewDTO
        { id = c.chatSlug
        , authorName = authorName
        , content = c.chatContent
        , timestamp = c.chatTimestamp
        }

  let unreadChats = filter (\(Entity _ c) -> c.chatIsUnread) chats
      firstUnreadId = fmap (\(Entity _ c) -> c.chatSlug) (listToMaybe unreadChats)
      lastUnreadChat = listToMaybe (reverse unreadChats)

  lastUnreadMessageDTO <- case lastUnreadChat of
    Nothing -> pure Nothing
    Just (Entity _ c) -> do
      mbAuthor <- get (AppUserKey c.chatAuthorId)
      let authorName = maybe "Unknown" (.appUserName) mbAuthor
      pure $ Just LastMessagePreviewDTO
        { id = c.chatSlug
        , authorName = authorName
        , content = c.chatContent
        , timestamp = c.chatTimestamp
        }

  pure RoomDTO
    { id = rId
    , name = r.roomName
    , topic = r.roomTopic
    , icon = r.roomIcon
    , unreadCount = r.roomUnreadCount
    , firstUnreadChatId = firstUnreadId
    , orderIndex = r.roomOrderIndex
    , membersCount = r.roomMembersCount
    , isPrivate = r.roomIsPrivate
    , lastMessage = lastMessageDTO
    , lastUnreadMessage = lastUnreadMessageDTO
    }

getRoomById :: Text -> SqlPersistT IO (Maybe RoomDTO)
getRoomById rId = do
  mbEnt <- get (RoomKey rId)
  case mbEnt of
    Nothing -> pure Nothing
    Just r -> Just <$> toRoomDTO (Entity (RoomKey rId) r)

getAllRoomsSorted :: SqlPersistT IO [RoomDTO]
getAllRoomsSorted = do
  roomEnts <- selectList [] [Asc RoomOrderIndex]
  roomDTOs <- forM roomEnts toRoomDTO
  -- Sort descending by last message timestamp (or 0)
  pure $ sortOn (Down . maybe 0 (.timestamp) . (.lastMessage)) roomDTOs

getRoomsHandler :: ConnectionPool -> Maybe Int -> Maybe Int64 -> Maybe Int64 -> Maybe Text -> Handler (Page RoomDTO)
getRoomsHandler pool mbPageSize mbAfter mbBefore mbSearch = liftIO $ runSqlPool (do
  let pageSize = fromMaybe 15 mbPageSize
  allRooms <- getAllRoomsSorted

  let matchingSearch = case mbSearch of
        Just q | not (T.null (T.strip q)) ->
          let lq = T.toLower (T.strip q)
          in filter (\r -> lq `T.isInfixOf` T.toLower r.name || lq `T.isInfixOf` T.toLower r.topic) allRooms
        _ -> allRooms

  case (mbAfter, mbBefore) of
    (Just afterTs, _) -> do
      let matching = filter (\r -> maybe 0 (.timestamp) r.lastMessage > afterTs) matchingSearch
          sortedAsc = sortOn (maybe 0 (.timestamp) . (.lastMessage)) matching
      pure Page
        { pageSize = pageSize
        , pageTotalCount = length matchingSearch
        , pageData = take pageSize sortedAsc
        }
    (_, Just beforeTs) -> do
      let matching = filter (\r -> maybe 0 (.timestamp) r.lastMessage < beforeTs) matchingSearch
          sortedDesc = sortOn (Down . maybe 0 (.timestamp) . (.lastMessage)) matching
      pure Page
        { pageSize = pageSize
        , pageTotalCount = length matchingSearch
        , pageData = take pageSize sortedDesc
        }
    (Nothing, Nothing) -> do
      let sortedDesc = sortOn (Down . maybe 0 (.timestamp) . (.lastMessage)) matchingSearch
      pure Page
        { pageSize = pageSize
        , pageTotalCount = length matchingSearch
        , pageData = take pageSize sortedDesc
        }
  ) pool

getRoomOneHandler :: ConnectionPool -> Text -> Handler (Maybe RoomDTO)
getRoomOneHandler pool rId = liftIO $ runSqlPool (getRoomById rId) pool

getRoomCurrentPrevNextHandler :: ConnectionPool -> Text -> Maybe Int -> Handler (Maybe (RoomDTO, Page RoomDTO, Page RoomDTO))
getRoomCurrentPrevNextHandler pool rId mbPageSize = liftIO $ runSqlPool (do
  let pageSize = fromMaybe 15 mbPageSize
  allRooms <- getAllRoomsSorted
  case listToMaybe (filter (\r -> r.id == rId) allRooms) of
    Nothing -> pure Nothing
    Just focus -> do
      let focusTs = maybe 0 (.timestamp) focus.lastMessage
          prevRooms = take pageSize $ filter (\r -> maybe 0 (.timestamp) r.lastMessage < focusTs) allRooms
          nextRooms = take pageSize $ sortOn (maybe 0 (.timestamp) . (.lastMessage)) $ filter (\r -> maybe 0 (.timestamp) r.lastMessage > focusTs) allRooms
          prevCount = length $ filter (\r -> maybe 0 (.timestamp) r.lastMessage < focusTs) allRooms
          nextCount = length $ filter (\r -> maybe 0 (.timestamp) r.lastMessage > focusTs) allRooms
          prevPage = Page { pageSize = pageSize, pageTotalCount = prevCount, pageData = prevRooms }
          nextPage = Page { pageSize = pageSize, pageTotalCount = nextCount, pageData = nextRooms }
      pure $ Just (focus, prevPage, nextPage)
  ) pool
