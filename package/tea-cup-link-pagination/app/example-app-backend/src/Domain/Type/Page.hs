{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}

module Domain.Type.Page
  ( Page (..)
  ) where

import Data.Aeson (FromJSON (..), Options (..), ToJSON (..), defaultOptions, genericParseJSON, genericToEncoding, genericToJSON)
import GHC.Generics (Generic)

data Page a = Page
  { pageSize :: Int
  , pageTotalCount :: Int
  , pageData :: [a]
  } deriving stock (Show, Eq, Generic)

pageOptions :: Options
pageOptions = defaultOptions
  { fieldLabelModifier = \case
      "pageSize" -> "size"
      "pageTotalCount" -> "total_count"
      "pageData" -> "data"
      other -> other
  }

instance ToJSON a => ToJSON (Page a) where
  toJSON = genericToJSON pageOptions
  toEncoding = genericToEncoding pageOptions

instance FromJSON a => FromJSON (Page a) where
  parseJSON = genericParseJSON pageOptions
