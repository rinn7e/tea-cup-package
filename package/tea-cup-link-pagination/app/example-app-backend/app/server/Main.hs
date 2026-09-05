module Main where

import Control.Monad.Logger (runStderrLoggingT)
import Data.ByteString.Char8 qualified as BS
import Data.Maybe (fromMaybe)
import Database.Persist.Postgresql (createPostgresqlPool)
import Database.Persist.Sql (runMigration, runSqlPool)
import Infrastructure.Api.Api (AppApi, appServer)
import Infrastructure.Interpreter.Real.DB.Schema.Schema (migrateAll)
import Network.Wai.Handler.Warp (run)
import Network.Wai.Middleware.Cors (simpleCors)
import Servant
import System.Environment (lookupEnv)
import Text.Read (readMaybe)

main :: IO ()
main = do
  maybeDbConn <- lookupEnv "DB_CONN"
  connStr <- case maybeDbConn of
    Just conn -> pure (BS.pack conn)
    Nothing -> do
      host <- fromMaybe "localhost" <$> lookupEnv "PGHOST"
      port <- fromMaybe "5432" <$> lookupEnv "PGPORT"
      user <- fromMaybe "postgres" <$> lookupEnv "PGUSER"
      pass <- fromMaybe "postgres" <$> lookupEnv "PGPASS"
      dbname <- fromMaybe "tea_cup_link_pagination_example_app" <$> lookupEnv "PGDATABASE"
      pure $ BS.pack $ "host=" ++ host ++ " port=" ++ port ++ " user=" ++ user ++ " password=" ++ pass ++ " dbname=" ++ dbname

  portStr <- fromMaybe "3011" <$> lookupEnv "PORT"
  let portNum = fromMaybe 3011 (readMaybe portStr)

  putStrLn $ "Starting Tea-Cup Link-Pagination Backend API on http://localhost:" ++ show portNum ++ "..."
  pool <- runStderrLoggingT $ createPostgresqlPool connStr 5
  runSqlPool (runMigration migrateAll) pool

  let api :: Proxy AppApi
      api = Proxy
      app = simpleCors (serve api (appServer pool))

  putStrLn $ "Backend is listening on port " ++ show portNum ++ "!"
  run portNum app
