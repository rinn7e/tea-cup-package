{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedRecordDot #-}
{-# LANGUAGE OverloadedStrings #-}

module Infrastructure.Api.SseSimulateApi
  ( SseSimulateApi
  , sseSimulateServer
  ) where

import Control.Monad.IO.Class (liftIO)
import Data.Aeson (FromJSON, ToJSON)
import Data.Maybe (listToMaybe)
import Data.Text (Text)
import Data.Text qualified as T
import Data.Time.Clock.POSIX (getPOSIXTime)
import Database.Persist
import Database.Persist.Sql (ConnectionPool, runSqlPool)
import Domain.Type.Chat (ChatDTO (..))
import Domain.Type.Room (RoomDTO (..))
import GHC.Generics (Generic)
import Infrastructure.Api.ChatApi (getChatById)
import Infrastructure.Api.RoomApi (getRoomById)
import Infrastructure.Interpreter.Real.DB.Schema.Schema
import Servant

data SimulatePayload = SimulatePayload
  { roomId :: Text
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data SimulateOtherRoomPayload = SimulateOtherRoomPayload
  { activeRoomId :: Text
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data SimulateOtherRoomResponse = SimulateOtherRoomResponse
  { chat :: ChatDTO
  , room :: RoomDTO
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

type SseSimulateApi =
       "api" :> "sse" :> "simulate" :> ReqBody '[JSON] SimulatePayload :> Post '[JSON] ChatDTO
  :<|> "api" :> "sse" :> "simulate-other-room" :> ReqBody '[JSON] SimulateOtherRoomPayload :> Post '[JSON] SimulateOtherRoomResponse

sseSimulateServer :: ConnectionPool -> Server SseSimulateApi
sseSimulateServer pool =
       simulateHandler pool
  :<|> simulateOtherRoomHandler pool

simulateHandler :: ConnectionPool -> SimulatePayload -> Handler ChatDTO
simulateHandler pool payload = do
  nowMs <- liftIO $ round . (* 1000) <$> getPOSIXTime
  mbChat <- liftIO $ runSqlPool (do
    latestChat <- selectList [ChatRoomId ==. payload.roomId] [Desc ChatTimestamp, LimitTo 1]
    let lastTs = maybe 0 (\(Entity _ c) -> c.chatTimestamp) (listToMaybe latestChat)
        uniqueTs = max nowMs (lastTs + 1)
        chatSlug = "message-" <> T.pack (show uniqueTs)

    let newChat = Chat
          { chatSlug = chatSlug
          , chatRoomId = payload.roomId
          , chatAuthorId = "user-alice"
          , chatContent = "⚡ [Real-time Event] Incoming real-time message for #" <> payload.roomId <> " with zero layout shift!"
          , chatTimestamp = uniqueTs
          , chatIsStarred = False
          , chatIsDraft = False
          , chatIsUnread = True
          }

    insert_ newChat
    insert_ (ChatReaction chatSlug "⚡" "user-alice")
    getChatById chatSlug
    ) pool
  case mbChat of
    Just c -> pure c
    Nothing -> throwError err500 { errBody = "Failed to simulate message" }

simulateOtherRoomHandler :: ConnectionPool -> SimulateOtherRoomPayload -> Handler SimulateOtherRoomResponse
simulateOtherRoomHandler pool payload = do
  nowMs <- liftIO $ round . (* 1000) <$> getPOSIXTime
  mbResult <- liftIO $ runSqlPool (do
    allRooms <- selectList [] [Asc RoomOrderIndex]
    let otherRooms = filter (\(Entity (RoomKey rId) _) -> rId /= payload.activeRoomId) allRooms
        mbTargetRoomEnt = case otherRooms of
          (r : _) -> Just r
          [] -> listToMaybe allRooms
    case mbTargetRoomEnt of
      Nothing -> pure Nothing
      Just (Entity (RoomKey targetRoomId) _) -> do
        update (RoomKey targetRoomId) [RoomUnreadCount +=. 1]

        latestChat <- selectList [ChatRoomId ==. targetRoomId] [Desc ChatTimestamp, LimitTo 1]
        let lastTs = maybe 0 (\(Entity _ c) -> c.chatTimestamp) (listToMaybe latestChat)
            uniqueTs = max nowMs (lastTs + 1)
            chatSlug = "message-" <> T.pack (show uniqueTs)

        let newChat = Chat
              { chatSlug = chatSlug
              , chatRoomId = targetRoomId
              , chatAuthorId = "user-alice"
              , chatContent = "⚡ [Real-time Event] Incoming message for #" <> targetRoomId <> " with zero layout shift!"
              , chatTimestamp = uniqueTs
              , chatIsStarred = False
              , chatIsDraft = False
              , chatIsUnread = True
              }

        insert_ newChat
        insert_ (ChatReaction chatSlug "⚡" "user-alice")
        mbChatDTO <- getChatById chatSlug
        mbRoomDTO <- getRoomById targetRoomId
        pure ((,) <$> mbChatDTO <*> mbRoomDTO)
    ) pool

  case mbResult of
    Just (chatDTO, roomDTO) -> pure SimulateOtherRoomResponse { chat = chatDTO, room = roomDTO }
    Nothing -> throwError err500 { errBody = "Failed to simulate message in other room" }
