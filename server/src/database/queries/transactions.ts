import { inArray } from "drizzle-orm";
import { transactionsTable } from "../schemas/accounts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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
  status: string,
) => {
  const result = await db
    .update(transactionsTable)
    .set({ status })
    .where(inArray(transactionsTable.id, id))
    .returning({
      id: transactionsTable.id,
      debit_account_id: transactionsTable.debit_account_number,
      credit_account_id: transactionsTable.credit_account_number,
      status: transactionsTable.status,
      update_date: transactionsTable.update_date,
    });

  if (!result) {
    throw new Error("update accounts status failed");
  }

  return result;
};

export const transactions = {
  updateStatusBatch,
  insertBatch,
};
