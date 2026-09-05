module Main where

import Test.Hspec

main :: IO ()
main = hspec $ do
  describe "ExampleAppBackend" $ do
    it "initializes correctly" $ do
      True `shouldBe` True
