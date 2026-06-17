ALTER TABLE partners
ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX partners_user_id_unique
ON partners(user_id);
