module Infrastructure.Interpreter.Real.DB.Schema.Schema where

import Data.Int (Int64)
import Data.Text (Text)
import Database.Persist.TH
import GHC.Generics (Generic)

share
  [ mkPersist sqlSettings
  , mkMigrate "migrateAll"
  ]
  [persistLowerCase|
AppUser sql=app_user
    slug Text
    name Text
    avatar Text
    role Text
    color Text
    Primary slug
    deriving Show Generic

Room sql=room
    slug Text
    name Text
    topic Text
    icon Text
    unreadCount Int default=0
    membersCount Int default=0
    isPrivate Bool default=false
    orderIndex Int default=0
    Primary slug
    deriving Show Generic

Chat sql=chat
    slug Text
    roomId Text
    authorId Text
    content Text
    timestamp Int64
    isStarred Bool default=false
    isDraft Bool default=false
    isUnread Bool default=false
    Primary slug
    deriving Show Generic

ChatReaction sql=chat_reaction
    chatSlug Text
    emoji Text
    userId Text
    UniqueReaction chatSlug emoji userId
    deriving Show Generic

Draft sql=draft
    slug Text
    roomId Text
    content Text
    updatedAt Int64
    Primary slug
    deriving Show Generic
|]
