CREATE TABLE "user_state" (
  "user_key" text PRIMARY KEY NOT NULL,
  "favorites" text NOT NULL DEFAULT '[]',
  "compare_ids" text NOT NULL DEFAULT '[]',
  "guide_answers" text NOT NULL DEFAULT '{}',
  "history" text NOT NULL DEFAULT '[]',
  "updated_at" text NOT NULL
);

CREATE INDEX "user_state_updated_at_idx" ON "user_state" ("updated_at");

PRAGMA optimize;
