import {
  pgTable,
  varchar,
  text,
  decimal,
  integer,
  smallint,
  timestamp,
  char,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

import { USER_ACCOUNT_STATUS } from "@accounts/schemas";

import {
  MAX_ACCOUNT_NAME_LENGTH,
  MAX_ACCOUNT_NUMER_LENGTH,
} from "@accounts/schemas";

const accountStatusEnum = pgEnum("status", USER_ACCOUNT_STATUS);

export const accountsTable = pgTable("accounts", {
  id: char({ length: MAX_ACCOUNT_NUMER_LENGTH })
    .unique()
    .primaryKey()
    .notNull(),
  number: varchar({ length: 120 }).unique().notNull(),
  user_id: char({ length: 12 })
    .notNull()
    .references(() => usersTable.id),
  balance: decimal<"number">({ precision: 11, scale: 2 })
    .notNull()
    .default(0.0),
  name: varchar({ length: MAX_ACCOUNT_NAME_LENGTH }).notNull(),
  ledger_id: integer()
    .notNull()
    .references(() => ledgersTable.id),
  account_type_id: smallint()
    .notNull()
    .references(() => accountTypesTable.id),
  max_balance: decimal<"number">({ precision: 11, scale: 2 }),
  creation_date: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  update_date: timestamp("updated_at", { withTimezone: true }),
  status: accountStatusEnum().notNull().default("enabled"),
});

export const transactionsTable = pgTable("transactions", {
  id: char({ length: 29 }).unique().primaryKey().notNull(),
  number: varchar({ length: 120 }).unique().notNull(),
  debit_account_number: varchar({ length: 120 })
    .notNull()
    .references(() => accountsTable.number),
  credit_account_number: varchar({ length: 120 })
    .notNull()
    .references(() => accountsTable.number),
  value: varchar().notNull(),
  creation_date: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  update_date: timestamp("updated_at", { withTimezone: true }),
  status: varchar({ length: 100 }).notNull().default("pending"),
  operation_id: integer()
    .notNull()
    .references(() => operationsTable.id),
});

export const ledgersTable = pgTable("ledgers", {
  id: integer().unique().primaryKey().notNull(),
  currency: varchar({ length: 100 }).notNull(),
});

export const accountTypesTable = pgTable("account-types", {
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
