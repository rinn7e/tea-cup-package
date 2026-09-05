{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}

module Infrastructure.Api.Api
  ( AppApi
  , appServer
  , module Infrastructure.Api.RoomApi
  , module Infrastructure.Api.ChatApi
  , module Infrastructure.Api.UserApi
  , module Infrastructure.Api.DraftApi
  , module Infrastructure.Api.SseSimulateApi
  ) where

import Database.Persist.Sql (ConnectionPool)
import Infrastructure.Api.ChatApi (ChatApi, chatServer)
import Infrastructure.Api.DraftApi (DraftApi, draftServer)
import Infrastructure.Api.RoomApi (RoomApi, roomServer)
import Infrastructure.Api.SseSimulateApi (SseSimulateApi, sseSimulateServer)
import Infrastructure.Api.UserApi (UserApi, userServer)
import Servant

type AppApi =
       RoomApi
  :<|> ChatApi
  :<|> UserApi
  :<|> DraftApi
  :<|> SseSimulateApi

appServer :: ConnectionPool -> Server AppApi
appServer pool =
       roomServer pool
  :<|> chatServer pool
  :<|> userServer pool
  :<|> draftServer pool
  :<|> sseSimulateServer pool
