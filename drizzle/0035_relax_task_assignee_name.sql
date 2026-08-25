-- DEPLOY ORDER: apply this BEFORE the multi-assignee code deploys, together
-- with 0034. Safe in both directions — the currently-serving deployment still
-- writes assignee_name on every insert, and the new one omits it. Dropping the
-- column outright is 0036, which must wait until the new code is live.

ALTER TABLE "tasks" ALTER COLUMN "assignee_name" DROP NOT NULL;