import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  accountsTable,
  ledgersTable,
  accountTypesTable,
} from "@db/schemas/accounts";
import { and, eq, gt, or, asc } from "drizzle-orm";

export type UserAccountsListCursor = {
  ledger_id: number; // asc
  creation_date: Date; // asc
  number: string; // asc
};

const getWithUserAccountNumbers = async (
  db: NodePgDatabase,
  user_id: string,
  account_id: string,
  debit_account: string,
  credit_account: string,
) => {
  const result = await db
    .select({
      account_id: accountsTable.id,
      account_number: accountsTable.number,
      account_type: accountsTable.account_type_id,
      ledger_id: accountsTable.ledger_id,
    })
    .from(accountsTable)
    .where(
      and(
        eq(accountsTable.user_id, user_id),
        eq(accountsTable.id, account_id),
        or(
          eq(accountsTable.number, debit_account),
          eq(accountsTable.number, credit_account),
        ),
      ),
    );

  const account = result[0];
  if (!account) {
    throw new Error("unauthorized to perform transaction");
  }

  return account;
};

const listUserAccounts = async (
  db: NodePgDatabase,
  userId: string,
  pageSize: number,
  balanceType?: "debit" | "credit",
  currency?: string,
  cursor?: UserAccountsListCursor,
) => {
  return await db
    .select({
      id: accountsTable.id,
      number: accountsTable.number,
      name: accountsTable.name,
      type: accountTypesTable.name,
      balance: accountsTable.balance,
      currency: ledgersTable.currency,
      status: accountsTable.status,
      ledger_id: accountsTable.ledger_id,
      creation_date: accountsTable.creation_date,
    })
    .from(accountsTable)
    .innerJoin(ledgersTable, eq(accountsTable.ledger_id, ledgersTable.id))
    .innerJoin(
      accountTypesTable,
      eq(accountsTable.account_type_id, accountTypesTable.id),
    )
    .where(
      and(
        eq(accountsTable.user_id, userId),
        balanceType
          ? eq(accountTypesTable.balance_type, balanceType)
          : undefined,
        currency ? eq(ledgersTable.currency, currency) : undefined,
        cursor
          ? or(
              gt(accountsTable.ledger_id, cursor.ledger_id),
              and(
                eq(accountsTable.ledger_id, cursor.ledger_id),
                gt(accountsTable.creation_date, cursor.creation_date),
              ),
              and(
                eq(accountsTable.ledger_id, cursor.ledger_id),
                eq(accountsTable.creation_date, cursor.creation_date),
                gt(accountsTable.number, cursor.number),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(
      asc(accountsTable.ledger_id),
      asc(accountsTable.creation_date),
      asc(accountsTable.number),
    )
    .limit(pageSize + 1);
};

const getUserAccount = async (
  db: NodePgDatabase,
  user_id: string,
  account_id: string,
) => {
  return await db
    .select({
      id: accountsTable.id,
      number: accountsTable.number,
      name: accountsTable.name,
      type: accountTypesTable.name,
      balance: accountsTable.balance,
      balance_type: accountTypesTable.balance_type,
      currency: ledgersTable.currency,
      creation_date: accountsTable.creation_date,
      update_date: accountsTable.update_date,
      max_balance: accountsTable.max_balance,
      status: accountsTable.status,
    })
    .from(accountsTable)
    .innerJoin(ledgersTable, eq(accountsTable.ledger_id, ledgersTable.id))
    .innerJoin(
      accountTypesTable,
      eq(accountsTable.account_type_id, accountTypesTable.id),
    )
    .where(
      and(eq(accountsTable.user_id, user_id), eq(accountsTable.id, account_id)),
    );
};

export type NewAccount = typeof accountsTable.$inferInsert;

const insertUserAccounts = (db: NodePgDatabase, account: NewAccount[]) => {
  return db.insert(accountsTable).values(account).returning({
    id: accountsTable.id,
    name: accountsTable.name,
    number: accountsTable.number,
    creation_date: accountsTable.creation_date,
    status: accountsTable.status,
  });
};

export const accounts = {
  insertUserAccounts,
  getWithUserAccountNumbers,
  listUserAccounts,
  getUserAccount,
};
