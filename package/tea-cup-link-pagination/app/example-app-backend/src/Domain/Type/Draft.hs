{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}

module Domain.Type.Draft where

import Data.Aeson (FromJSON, ToJSON)
import Data.Int (Int64)
import Data.Text (Text)
import GHC.Generics (Generic)

data DraftDTO = DraftDTO
  { id :: Text
  , roomId :: Text
  , content :: Text
  , updatedAt :: Int64
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)

data SaveDraftPayload = SaveDraftPayload
  { content :: Text
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)
