{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}

module Domain.Type.Room
  ( RoomDTO (..)
  , LastMessagePreviewDTO (..)
  ) where

import Data.Aeson (FromJSON, ToJSON)
import Data.Int (Int64)
import Data.Text (Text)
import GHC.Generics (Generic)

data LastMessagePreviewDTO = LastMessagePreviewDTO
  { id :: Text
  , authorName :: Text
  , content :: Text
  , timestamp :: Int64
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data RoomDTO = RoomDTO
  { id :: Text
  , name :: Text
  , topic :: Text
  , icon :: Text
  , unreadCount :: Int
  , firstUnreadChatId :: Maybe Text
  , orderIndex :: Int
  , membersCount :: Int
  , isPrivate :: Bool
  , lastMessage :: Maybe LastMessagePreviewDTO
  , lastUnreadMessage :: Maybe LastMessagePreviewDTO
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)
