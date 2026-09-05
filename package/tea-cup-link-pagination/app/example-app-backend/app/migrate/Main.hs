module Main where

import Control.Monad (forM_, when)
import Control.Monad.IO.Class (liftIO)
import Control.Monad.Logger (runStdoutLoggingT)
import Data.ByteString qualified as BS
import Data.ByteString.Char8 qualified as BSC
import Data.List (isSuffixOf, sort)
import Data.Maybe (fromMaybe)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TE
import Database.Persist.Postgresql (createPostgresqlPool)
import Database.Persist.Sql
  ( SqlPersistT
  , getMigration
  , rawExecute
  , runSqlPool
  )
import Infrastructure.Interpreter.Real.DB.Migration.Migration
  ( generateMigration
  , getAppliedMigrations
  , getPendingMigrations
  , runMigrationDownOne
  , runMigrationUpOne
  , runMigrationsUp
  )
import Infrastructure.Interpreter.Real.DB.Schema.Schema (migrateAll)
import System.Directory (createDirectoryIfMissing, listDirectory)
import System.Environment (getArgs, lookupEnv)
import System.Exit (exitFailure, exitSuccess)
import System.FilePath (takeExtension, (</>))
import UnliftIO.Exception (SomeException, try)

main :: IO ()
main = do
  args <- getArgs
  maybeDbConn <- lookupEnv "DB_CONN"
  connStr <- case maybeDbConn of
    Just conn -> pure (BSC.pack conn)
    Nothing -> do
      host <- fromMaybe "localhost" <$> lookupEnv "PGHOST"
      port <- fromMaybe "5432" <$> lookupEnv "PGPORT"
      user <- fromMaybe "postgres" <$> lookupEnv "PGUSER"
      pass <- fromMaybe "postgres" <$> lookupEnv "PGPASS"
      dbname <- fromMaybe "tea_cup_link_pagination_example_app" <$> lookupEnv "PGDATABASE"
      pure $ BSC.pack $ "host=" ++ host ++ " port=" ++ port ++ " user=" ++ user ++ " password=" ++ pass ++ " dbname=" ++ dbname

  pool <- runStdoutLoggingT $ createPostgresqlPool connStr 10

  case args of
    ["up"] -> do
      runSqlPool runMigrationsUp pool
      putStrLn "Migrations completed."
      exitSuccess
    ["up-one"] -> do
      runSqlPool runMigrationUpOne pool
      putStrLn "Migration up-one completed."
      exitSuccess
    ["down-one"] -> do
      runSqlPool runMigrationDownOne pool
      putStrLn "Migration down-one completed."
      exitSuccess
    ["status"] -> do
      runSqlPool
        ( do
            liftIO $ do
              putStrLn "-----------------------------------------------------------------"
              putStrLn "database initialization logs"
              putStrLn "-----------------------------------------------------------------"

            pending <- getPendingMigrations
            applied <- getAppliedMigrations

            liftIO $ do
              putStrLn "-----------------------------------------------------------------"
              putStrLn ""

            liftIO $ createDirectoryIfMissing True "resource/migration"
            allFiles <- liftIO $ listDirectory "resource/migration"
            let allUps = sort [f | f <- allFiles, takeExtension f == ".sql", ".up.sql" `isSuffixOf` f]

            (failedFiles, incorrectApplied, missing) <- simulateAndVerify allUps applied

            let needsUpdate =
                  not (null pending)
                    || not (null missing)
                    || not (null incorrectApplied)

            if not needsUpdate
              then liftIO $ do
                putStrLn "Migration Status:"
                forM_ allUps $ \f -> putStrLn ("  - " ++ f ++ " DONE")
                putStrLn "Database schema is up to date."
              else do
                liftIO $ do
                  putStrLn "****************************************************"
                  putStrLn "WARNING: Database schema mismatch detected!"
                  putStrLn "Migration Status:"
                  forM_ allUps $ \f -> do
                    let version = read (take 3 f) :: Int
                        status =
                          if version `elem` applied
                            then
                              if f `elem` incorrectApplied
                                then "DONE, INCORRECT"
                                else "DONE"
                            else
                              if f `elem` failedFiles
                                then "PENDING, INCORRECT"
                                else "PENDING"
                    putStrLn ("  - " ++ f ++ " " ++ status)
                  when (not $ null missing) $ do
                    putStrLn "  - ??? MISSING (run make migrate-generate to generate it)"

                  if not (null incorrectApplied)
                    then do
                      putStrLn ""
                      putStrLn "WARNING: Already applied migrations are INCORRECT!"
                    else
                      if not (null failedFiles)
                        then do
                          putStrLn ""
                          putStrLn "WARNING: One or more pending migrations are INCORRECT!"
                        else
                          if not (null missing)
                            then do
                              putStrLn ""
                              putStrLn "WARNING: Database schema is out of sync!"
                            else do
                              putStrLn ""
                              putStrLn "WARNING: Database schema has pending migrations!"
                  putStrLn "****************************************************"
                  exitFailure
        )
        pool
      exitSuccess
    ["generate", name] -> do
      runSqlPool (generateMigration name) pool
      exitSuccess
    _ -> do
      putStrLn "Usage: migrate-exe [up|up-one|down-one|status|generate <name>]"
      exitFailure

simulateAndVerify :: [String] -> [Int] -> SqlPersistT IO ([String], [String], [T.Text])
simulateAndVerify allUps applied = do
  rawExecute "DROP SCHEMA IF EXISTS temp_migration_sim CASCADE" []
  rawExecute "CREATE SCHEMA temp_migration_sim" []
  rawExecute "SET search_path TO temp_migration_sim" []

  let loop [] failedPending = return failedPending
      loop (f : fs) failedPending = do
        let version = read (take 3 f) :: Int
            isPending = version `notElem` applied

        rawExecute "SAVEPOINT migration_sim_savepoint" []
        res <- try $ do
          content <- liftIO $ BS.readFile ("resource/migration" </> f)
          rawExecute (TE.decodeUtf8 content) []

        case res of
          Left (_ :: SomeException) -> do
            rawExecute "ROLLBACK TO SAVEPOINT migration_sim_savepoint" []
            if isPending
              then loop fs (f : failedPending)
              else loop fs failedPending
          Right () -> do
            rawExecute "RELEASE SAVEPOINT migration_sim_savepoint" []
            loop fs failedPending

  failedPending <- loop allUps []

  missing <- getMigration migrateAll

  rawExecute "SET search_path TO public" []
  rawExecute "DROP SCHEMA IF EXISTS temp_migration_sim CASCADE" []

  return (failedPending, [], missing)
