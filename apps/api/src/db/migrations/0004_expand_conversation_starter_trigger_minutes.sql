PRAGMA foreign_keys=OFF;

CREATE TABLE conversation_starters_new (
  id TEXT PRIMARY KEY NOT NULL,
  interests_id TEXT,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  trigger_minute INTEGER NOT NULL,
  CONSTRAINT conversation_starters_trigger_minute_check CHECK(trigger_minute IN (0, 5, 10, 15, 20, 25, 30, 35, 40, 45)),
  FOREIGN KEY (interests_id) REFERENCES interests(id) ON DELETE CASCADE
);

INSERT INTO conversation_starters_new (
  id,
  interests_id,
  category,
  prompt,
  trigger_minute
)
SELECT
  id,
  interests_id,
  category,
  prompt,
  trigger_minute
FROM conversation_starters;

DROP TABLE conversation_starters;

ALTER TABLE conversation_starters_new RENAME TO conversation_starters;

PRAGMA foreign_keys=ON;
