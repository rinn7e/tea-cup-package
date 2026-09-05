module Infrastructure.Interpreter.Real.DB.Migration.Migration
  ( runMigrationsUp
  , runMigrationUpOne
  , runMigrationDownOne
  , ensureMigrationsTable
  , getAppliedMigrations
  , getLastRanMigration
  , generateMigration
  , getPendingMigrations
  ) where

import Control.Monad (forM_, when)
import Control.Monad.IO.Class (liftIO)
import Data.ByteString qualified as BS
import Data.List (isSuffixOf, sort)
import Data.Text qualified as T
import Data.Text.Encoding qualified as TE
import Data.Text.IO qualified as TIO
import Database.Persist (toPersistValue)
import Database.Persist.Sql
  ( Single (..)
  , SqlPersistT
  , getMigration
  , rawExecute
  , rawSql
  , transactionUndo
  )
import Infrastructure.Interpreter.Real.DB.Schema.Schema (migrateAll)
import System.Directory (createDirectoryIfMissing, listDirectory)
import System.Exit (exitFailure)
import System.FilePath (takeExtension, (</>))
import Text.Printf (printf)
import UnliftIO.Exception (SomeException, try)

getPendingMigrations :: SqlPersistT IO [String]
getPendingMigrations = do
  ensureMigrationsTable
  applied <- getAppliedMigrations
  liftIO $ createDirectoryIfMissing True "resource/migration"
  files <- liftIO $ listDirectory "resource/migration"
  let ups = sort [f | f <- files, takeExtension f == ".sql", ".up.sql" `isSuffixOf` f]
  return [f | f <- ups, read (take 3 f) `notElem` applied]

runMigrationsUp :: SqlPersistT IO ()
runMigrationsUp = do
  ensureMigrationsTable
  pending <- getPendingMigrations

  let runSim = do
        let simLoop [] failed = return failed
            simLoop (f : fs) failed = do
              res <- try $ do
                content <- liftIO $ BS.readFile ("resource/migration" </> f)
                rawExecute (TE.decodeUtf8 content) []
              case res of
                Left (_ :: SomeException) -> return (f : failed)
                Right () -> simLoop fs failed
        simLoop pending []

  failedFiles <- do
    res <- try runSim
    transactionUndo
    case res of
      Left (_ :: SomeException) -> return pending
      Right failed -> return failed

  if not (null failedFiles)
    then liftIO $ do
      putStrLn "****************************************************"
      putStrLn "ERROR: Cannot apply migrations!"
      putStrLn "One or more pending migration files are INCORRECT."
      putStrLn "Please run 'make migrate-status' to see details."
      putStrLn "****************************************************"
      exitFailure
    else do
      ensureMigrationsTable
      applied <- getAppliedMigrations
      liftIO $ createDirectoryIfMissing True "resource/migration"
      files <- liftIO $ listDirectory "resource/migration"
      let ups = sort [f | f <- files, takeExtension f == ".sql", ".up.sql" `isSuffixOf` f]

      forM_ ups $ \f -> do
        let version = read (take 3 f) :: Int
        when (version `notElem` applied) $ do
          liftIO $ putStrLn $ "Applying migration: " ++ f
          content <- liftIO $ BS.readFile ("resource/migration" </> f)
          rawExecute (TE.decodeUtf8 content) []
          rawExecute "INSERT INTO schema_migrations (version) VALUES (?)" [toPersistValue version]

runMigrationUpOne :: SqlPersistT IO ()
runMigrationUpOne = do
  ensureMigrationsTable
  applied <- getAppliedMigrations
  liftIO $ createDirectoryIfMissing True "resource/migration"
  files <- liftIO $ listDirectory "resource/migration"
  let ups = sort [f | f <- files, takeExtension f == ".sql", ".up.sql" `isSuffixOf` f]

  let pending = [f | f <- ups, read (take 3 f) `notElem` applied]
  case pending of
    [] -> liftIO $ putStrLn "No pending migrations to run."
    (f : _) -> do
      let version = read (take 3 f) :: Int
      liftIO $ putStrLn $ "Applying single migration: " ++ f
      content <- liftIO $ BS.readFile ("resource/migration" </> f)
      rawExecute (TE.decodeUtf8 content) []
      rawExecute "INSERT INTO schema_migrations (version) VALUES (?)" [toPersistValue version]

runMigrationDownOne :: SqlPersistT IO ()
runMigrationDownOne = do
  ensureMigrationsTable
  maybeLast <- getLastRanMigration
  case maybeLast of
    Nothing -> liftIO $ putStrLn "No migrations to revert."
    Just version -> do
      liftIO $ createDirectoryIfMissing True "resource/migration"
      files <- liftIO $ listDirectory "resource/migration"
      let prefix = printf "%03d" version
          matchingDown = [f | f <- files, take 3 f == prefix, ".down.sql" `isSuffixOf` f]
      case matchingDown of
        [] -> liftIO $ putStrLn $ "Error: Down migration file for version " ++ prefix ++ " not found."
        (f : _) -> do
          liftIO $ putStrLn $ "Reverting migration: " ++ f
          content <- liftIO $ BS.readFile ("resource/migration" </> f)
          rawExecute (TE.decodeUtf8 content) []
          rawExecute "DELETE FROM schema_migrations WHERE version = ?" [toPersistValue version]

ensureMigrationsTable :: SqlPersistT IO ()
ensureMigrationsTable = do
  rawExecute
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)"
    []

getAppliedMigrations :: SqlPersistT IO [Int]
getAppliedMigrations = do
  res <- rawSql "SELECT version FROM schema_migrations ORDER BY version ASC" []
  return [v | Single v <- res]

getLastRanMigration :: SqlPersistT IO (Maybe Int)
getLastRanMigration = do
  res <- rawSql "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1" []
  case res of
    [Single v] -> return (Just v)
    _ -> return Nothing

generateMigration :: String -> SqlPersistT IO ()
generateMigration name = do
  ensureMigrationsTable
  liftIO $ createDirectoryIfMissing True "resource/migration"
  files <- liftIO $ listDirectory "resource/migration"
  let existingVersions = [read (take 3 f) :: Int | f <- files, takeExtension f == ".sql"]
      nextVersion = if null existingVersions then 1 else maximum existingVersions + 1
      prefix = printf "%03d" nextVersion
      upFileName = prefix ++ "_" ++ name ++ ".up.sql"
      downFileName = prefix ++ "_" ++ name ++ ".down.sql"
      upPath = "resource/migration" </> upFileName
      downPath = "resource/migration" </> downFileName

  statements <- getMigration migrateAll
  let upSql = T.unlines [stmt <> ";" | stmt <- statements]

  liftIO $ do
    TIO.writeFile upPath upSql
    TIO.writeFile downPath "-- Write rollback SQL statements here\n"
    putStrLn $ "Generated up migration: " ++ upPath
    putStrLn $ "Generated down migration: " ++ downPath
