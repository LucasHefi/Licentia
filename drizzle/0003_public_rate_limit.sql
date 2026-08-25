create table if not exists "public_rate_limit" (
  "key" text not null primary key,
  "window_start" integer not null,
  "count" integer not null
);
