import {
  pgTable,
  varchar,
  text,
  decimal,
  integer,
  smallint,
  timestamp,
  char,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

import {
  MAX_ACCOUNT_NAME_LENGTH,
  MAX_ACCOUNT_NUMER_LENGTH,
} from "@accounts/schemas";

export const accountsTable = pgTable("accounts", {
  id: char({ length: MAX_ACCOUNT_NUMER_LENGTH })
    .unique()
    .primaryKey()
    .notNull(),
  number: varchar({ length: 120 }).unique().notNull(),
  user_id: char({ length: 12 })
    .unique()
    .notNull()
    .references(() => usersTable.id),
  balance: decimal<"number">({ precision: 11, scale: 2 })
    .notNull()
    .default(0.0),
  name: varchar({ length: MAX_ACCOUNT_NAME_LENGTH }).notNull(),
  ledger_id: integer()
    .unique()
    .notNull()
    .references(() => ledgersTable.id),
  account_type_id: smallint()
    .notNull()
    .unique()
    .references(() => acountTypesTable.id),
  max_balance: decimal<"number">({ precision: 11, scale: 2 }),
  creation_date: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  update_date: timestamp("updated_at", { withTimezone: true }),
  status: varchar({ length: 255 }).notNull().default("pending"),
});

export const transactionsTable = pgTable("transactions", {
  id: char({ length: 29 }).unique().primaryKey().notNull(),
  number: varchar({ length: 120 }).unique().notNull(),
  debit_account_number: varchar({ length: 120 })
    .unique()
    .notNull()
    .references(() => accountsTable.number),
  credit_account_number: varchar({ length: 120 })
    .unique()
    .notNull()
    .references(() => accountsTable.number),
  value: decimal<"number">({ precision: 11, scale: 2 }).notNull(),
  type: varchar({ length: 100 }).notNull(),
  creation_date: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  update_date: timestamp("updated_at", { withTimezone: true }),
  status: varchar({ length: 100 }).notNull().default("pending"),
  operation_id: integer()
    .unique()
    .notNull()
    .references(() => operationsTable.id),
});

export const ledgersTable = pgTable("ledgers", {
  id: integer().unique().primaryKey().notNull(),
  currency: varchar({ length: 100 }).notNull(),
});

export const acountTypesTable = pgTable("account-types", {
  id: smallint().unique().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  balance_type: varchar({ length: 255 }).notNull(),
});

export const operationsTable = pgTable("operations", {
  id: integer().unique().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
});
