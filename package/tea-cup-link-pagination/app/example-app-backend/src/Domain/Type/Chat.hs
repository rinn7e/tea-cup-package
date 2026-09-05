{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}

module Domain.Type.Chat
  ( ReactionDTO (..)
  , ChatDTO (..)
  , SendChatPayload (..)
  , ToggleReactionPayload (..)
  , SimulateOtherRoomResponse (..)
  ) where

import Data.Aeson (FromJSON, ToJSON)
import Data.Int (Int64)
import Data.Text (Text)
import Domain.Type.User (UserDTO)
import GHC.Generics (Generic)

data ReactionDTO = ReactionDTO
  { emoji :: Text
  , count :: Int
  , userIds :: [Text]
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data ChatDTO = ChatDTO
  { id :: Text
  , roomId :: Text
  , author :: UserDTO
  , content :: Text
  , timestamp :: Int64
  , reactions :: [ReactionDTO]
  , isStarred :: Bool
  , isDraft :: Bool
  , isUnread :: Bool
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data SendChatPayload = SendChatPayload
  { content :: Text
  , authorId :: Maybe Text
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data ToggleReactionPayload = ToggleReactionPayload
  { emoji :: Text
  , userId :: Text
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data SimulateOtherRoomResponse = SimulateOtherRoomResponse
  { chat :: ChatDTO
  , room :: Text -- targetRoomId
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)
