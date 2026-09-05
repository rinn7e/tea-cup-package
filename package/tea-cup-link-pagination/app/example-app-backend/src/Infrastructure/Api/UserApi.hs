{-# LANGUAGE OverloadedStrings #-}

module Infrastructure.Api.UserApi
  ( UserApi
  , userServer
  , toUserDTO
  , getUserById
  ) where

import Control.Monad.IO.Class (liftIO)
import Data.Text (Text)
import Database.Persist
import Database.Persist.Sql (ConnectionPool, SqlPersistT, runSqlPool)
import Domain.Type.User (UserDTO (..))
import Infrastructure.Interpreter.Real.DB.Schema.Schema
import Servant

type UserApi =
       "api" :> "users" :> Get '[JSON] [UserDTO]
  :<|> "api" :> "users" :> Capture "id" Text :> Get '[JSON] UserDTO

userServer :: ConnectionPool -> Server UserApi
userServer pool =
       getUsersHandler pool
  :<|> getUserHandler pool

toUserDTO :: Entity AppUser -> UserDTO
toUserDTO (Entity _ u) =
  UserDTO
    { id = u.appUserSlug
    , name = u.appUserName
    , avatar = u.appUserAvatar
    , role = u.appUserRole
    , color = u.appUserColor
    }

getUsersHandler :: ConnectionPool -> Handler [UserDTO]
getUsersHandler pool = liftIO $ runSqlPool (do
  users <- selectList [] [Asc AppUserName]
  pure (map toUserDTO users)
  ) pool

getUserHandler :: ConnectionPool -> Text -> Handler UserDTO
getUserHandler pool uid = do
  mbUser <- liftIO $ runSqlPool (getUserById uid) pool
  case mbUser of
    Just u -> pure u
    Nothing -> throwError err404 { errBody = "User not found" }

getUserById :: Text -> SqlPersistT IO (Maybe UserDTO)
getUserById uid = do
  mbEnt <- get (AppUserKey uid)
  pure $ fmap (\u -> toUserDTO (Entity (AppUserKey uid) u)) mbEnt
