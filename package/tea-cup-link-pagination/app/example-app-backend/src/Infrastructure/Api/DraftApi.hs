{-# LANGUAGE OverloadedRecordDot #-}
{-# LANGUAGE OverloadedStrings #-}

module Infrastructure.Api.DraftApi
  ( DraftApi
  , draftServer
  ) where

import Control.Monad.IO.Class (liftIO)
import Data.Text (Text)
import Data.Text qualified as T
import Data.Time.Clock.POSIX (getPOSIXTime)
import Database.Persist
import Database.Persist.Sql (ConnectionPool, runSqlPool)
import Domain.Type.Draft (DraftDTO (..), SaveDraftPayload (..))
import Infrastructure.Interpreter.Real.DB.Schema.Schema
import Servant

type DraftApi =
       "api" :> "rooms" :> Capture "roomId" Text :> "drafts" :> Get '[JSON] [DraftDTO]
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "drafts" :> ReqBody '[JSON] SaveDraftPayload :> Post '[JSON] DraftDTO
  :<|> "api" :> "rooms" :> Capture "roomId" Text :> "drafts" :> Capture "draftId" Text :> Delete '[JSON] Bool

draftServer :: ConnectionPool -> Server DraftApi
draftServer pool =
       getDraftsHandler pool
  :<|> saveDraftHandler pool
  :<|> deleteDraftHandler pool

toDraftDTO :: Entity Draft -> DraftDTO
toDraftDTO (Entity (DraftKey dId) d) =
  DraftDTO
    { id = dId
    , roomId = d.draftRoomId
    , content = d.draftContent
    , updatedAt = d.draftUpdatedAt
    }

getDraftsHandler :: ConnectionPool -> Text -> Handler [DraftDTO]
getDraftsHandler pool rId = liftIO $ runSqlPool (do
  draftEnts <- selectList [DraftRoomId ==. rId] [Desc DraftUpdatedAt]
  pure (map toDraftDTO draftEnts)
  ) pool

saveDraftHandler :: ConnectionPool -> Text -> SaveDraftPayload -> Handler DraftDTO
saveDraftHandler pool rId payload = do
  nowMs <- liftIO $ round . (* 1000) <$> getPOSIXTime
  let draftId = "draft-" <> T.pack (show nowMs)
      newDraft = Draft
        { draftSlug = draftId
        , draftRoomId = rId
        , draftContent = payload.content
        , draftUpdatedAt = nowMs
        }
  liftIO $ runSqlPool (insert_ newDraft) pool
  pure DraftDTO
    { id = draftId
    , roomId = rId
    , content = payload.content
    , updatedAt = nowMs
    }

deleteDraftHandler :: ConnectionPool -> Text -> Text -> Handler Bool
deleteDraftHandler pool _rId dId = do
  liftIO $ runSqlPool (delete (DraftKey dId)) pool
  pure True
