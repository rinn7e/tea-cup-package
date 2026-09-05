{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}

module Domain.Type.User where

import Data.Aeson (FromJSON, ToJSON)
import Data.Text (Text)
import GHC.Generics (Generic)

data UserDTO = UserDTO
  { id :: Text
  , name :: Text
  , avatar :: Text
  , role :: Text
  , color :: Text
  }
  deriving (Show, Eq, Generic, ToJSON, FromJSON)
