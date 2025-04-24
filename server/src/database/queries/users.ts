import { eq, sql } from "drizzle-orm";
import { accountsTable } from "../schemas/accounts";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type NewAccount = typeof accountsTable.$inferInsert;

const insert = async (db: NodePgDatabase, account: NewAccount) => {
  return new Promise<{ number: bigint; id: string }>((res, rej) => {
    db.insert(accountsTable)
      .values(account)
      .returning({ number: accountsTable.number, id: accountsTable.id })
      .then((result) => {
        const value = result[0];

        if (!value) {
          return rej("create account record failed");
        }

        const account = {
          number: BigInt(value.number),
          id: value.id,
        };

        return res(account);
      });
  });
};

export type UpdateAccount = {
  status?: string;
  max_balance?: number;
  balance?: number;
  name?: string;
};

const update = async (
  db: NodePgDatabase,
  id: string,
  update: UpdateAccount,
) => {
  const result = await db
    .update(accountsTable)
    .set({ ...update, update_date: sql`NOW()` })
    .where(eq(accountsTable.id, id))
    .returning({ id: accountsTable.id });

  if (!result) {
    throw new Error("update account status failed");
  }

  return result[0];
};

// Update batch using the insert/update api

export const accounts = {
  insert,
  update,
};
