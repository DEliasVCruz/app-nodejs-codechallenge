import { and, eq, or, lt, desc, inArray, aliasedTable } from "drizzle-orm";
import {
  transactionsTable,
  operationsTable,
  ledgersTable,
  accountsTable,
  accountTypesTable,
} from "@db/schemas/accounts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type {
  TransactionStatus,
  UserTransactionsListCursor,
} from "@transactions/schemas";

import { DateTime } from "luxon";

export type NewTransaction = typeof transactionsTable.$inferInsert;

const insertBatch = async (
  db: NodePgDatabase,
  transaction: NewTransaction[],
) => {
  const result = await db
    .insert(transactionsTable)
    .values(transaction)
    .returning({
      id: transactionsTable.id,
      debit_account_id: transactionsTable.debit_account_number,
      credit_account_id: transactionsTable.credit_account_number,
      creation_date: transactionsTable.creation_date,
      status: transactionsTable.status,
    });

  if (!result) {
    throw new Error("create transaction records failed");
  }

  return result;
};

const updateStatusBatch = async (
  db: NodePgDatabase,
  id: Array<string>,
  status: TransactionStatus,
) => {
  const result = await db
    .update(transactionsTable)
    .set({ status, update_date: new Date(DateTime.utc().toISO()) })
    .where(inArray(transactionsTable.id, id))
    .returning({
      id: transactionsTable.id,
      debit_account_id: transactionsTable.debit_account_number,
      credit_account_id: transactionsTable.credit_account_number,
      status: transactionsTable.status,
      update_date: transactionsTable.update_date,
    });

  if (!result) {
    throw new Error("update transactions status failed");
  }

  return result;
};

const debitAccounts = aliasedTable(accountsTable, "debit_accounts");
const creditAccounts = aliasedTable(accountsTable, "credit_accounts");

const listUserTransactions = async (
  db: NodePgDatabase,
  userId: string,
  pageSize: number,
  accountId?: string,
  cursor?: UserTransactionsListCursor,
) => {
  return await db
    .select({
      id: transactionsTable.id,
      number: transactionsTable.number,
      value: transactionsTable.value,
      creation_date: transactionsTable.creation_date,
      status: transactionsTable.status,
      opertaion_name: operationsTable.long_name,
      credit_account_id: creditAccounts.id,
      debit_account_id: debitAccounts.id,
      currency: ledgersTable.currency,
      balance_type: accountTypesTable.balance_type,
      account_id: accountsTable.id,
    })
    .from(transactionsTable)
    .innerJoin(
      operationsTable,
      eq(operationsTable.id, transactionsTable.operation_id),
    )
    .innerJoin(
      accountsTable,
      or(
        eq(accountsTable.number, transactionsTable.debit_account_number),
        eq(accountsTable.number, transactionsTable.credit_account_number),
      ),
    )
    .innerJoin(accountTypesTable, eq(accountsTable.id, accountTypesTable.id))
    .innerJoin(ledgersTable, eq(ledgersTable.id, accountsTable.ledger_id))
    .innerJoin(
      debitAccounts,
      eq(debitAccounts.number, transactionsTable.debit_account_number),
    )
    .innerJoin(
      creditAccounts,
      eq(creditAccounts.number, transactionsTable.credit_account_number),
    )
    .where(
      and(
        eq(accountsTable.user_id, userId),
        accountId ? eq(accountsTable.id, accountId) : undefined,
        cursor
          ? or(
              lt(transactionsTable.creation_date, cursor.creation_date),
              and(
                eq(transactionsTable.creation_date, cursor.creation_date),
                lt(transactionsTable.number, cursor.number),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(
      desc(transactionsTable.creation_date),
      desc(transactionsTable.number),
    )
    .limit(pageSize + 1);
};

const getTransaction = async (
  db: NodePgDatabase,
  userId: string,
  transactionId: string,
) => {
  return await db
    .select({
      id: transactionsTable.id,
      number: transactionsTable.number,
      value: transactionsTable.value,
      creation_date: transactionsTable.creation_date,
      status: transactionsTable.status,
      opertaion_name: operationsTable.long_name,
      credit_account_id: creditAccounts.id,
      debit_account_id: debitAccounts.id,
      credit_account_number: creditAccounts.number,
      debit_account_number: debitAccounts.number,
      credit_account_name: creditAccounts.name,
      debit_account_name: debitAccounts.name,
      account_type_name: accountTypesTable.long_name,
      currency: ledgersTable.currency,
      balance_type: accountTypesTable.balance_type,
      update_date: transactionsTable.update_date,
      account_id: accountsTable.id,
    })
    .from(transactionsTable)
    .innerJoin(
      operationsTable,
      eq(operationsTable.id, transactionsTable.operation_id),
    )
    .innerJoin(
      accountsTable,
      or(
        eq(accountsTable.number, transactionsTable.debit_account_number),
        eq(accountsTable.number, transactionsTable.credit_account_number),
      ),
    )
    .innerJoin(accountTypesTable, eq(accountsTable.id, accountTypesTable.id))
    .innerJoin(ledgersTable, eq(ledgersTable.id, accountsTable.ledger_id))
    .innerJoin(
      debitAccounts,
      eq(debitAccounts.number, transactionsTable.debit_account_number),
    )
    .innerJoin(
      creditAccounts,
      eq(creditAccounts.number, transactionsTable.credit_account_number),
    )
    .where(
      and(
        eq(accountsTable.user_id, userId),
        eq(transactionsTable.id, transactionId),
      ),
    );
};

export const transactions = {
  updateStatusBatch,
  insertBatch,
  listUserTransactions,
  getTransaction,
};
