import { inArray } from "drizzle-orm";
import { transactionsTable } from "../schemas/accounts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { TransactionStatus } from "@transactions/schemas";

import { DateTime } from "luxon";

export type NewTransaction = typeof transactionsTable.$inferInsert;

const insertBatch = async (
  db: NodePgDatabase,
  transaction: NewTransaction[],
) => {
  console.log(
    "The insert query",
    db
      .insert(transactionsTable)
      .values(transaction)
      .returning({
        id: transactionsTable.id,
        debit_account_id: transactionsTable.debit_account_number,
        credit_account_id: transactionsTable.credit_account_number,
        creation_date: transactionsTable.creation_date,
        status: transactionsTable.status,
      })
      .toSQL(),
  );
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

export const transactions = {
  updateStatusBatch,
  insertBatch,
};
