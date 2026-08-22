create table "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" integer not null
);

create unique index "rateLimit_key_uidx" on "rateLimit" ("key");

PRAGMA optimize;
