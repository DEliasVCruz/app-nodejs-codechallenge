import {
  smallint,
  pgTable,
  varchar,
  char,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: char({ length: 12 }).unique().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  age: smallint(),
  email: varchar({ length: 255 }).unique(),
  phone: varchar({ length: 100 }),
  document_id: varchar({ length: 100 }).notNull().unique(),
  role: varchar({ length: 100 }).notNull(),
  creation_date: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  update_date: timestamp("updated_at", { withTimezone: true }),
});
