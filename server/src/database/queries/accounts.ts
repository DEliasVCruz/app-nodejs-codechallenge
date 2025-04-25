import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { accountsTable } from "@db/schemas/accounts";
import { and, eq, or, inArray } from "drizzle-orm";

import type { AccountStatus } from "@accounts/schemas";
import { DateTime } from "luxon";

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

const updateStatusBatch = async (
  db: NodePgDatabase,
  id: Array<string>,
  status: AccountStatus,
) => {
  const result = await db
    .update(accountsTable)
    .set({ status: status, update_date: new Date(DateTime.utc().toISO()) })
    .where(inArray(accountsTable.id, id))
    .returning({
      account_id: accountsTable.id,
    });

  if (!result) {
    throw new Error("update accounts status failed");
  }

  return result;
};

export const accounts = {
  getWithUserAccountNumbers,
  updateStatusBatch,
};
