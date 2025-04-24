import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { accountsTable } from "@db/schemas/accounts";
import { and, eq, or } from "drizzle-orm";

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

export const accounts = {
  getWithUserAccountNumbers,
};
