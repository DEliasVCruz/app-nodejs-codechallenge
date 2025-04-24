import { eq, sql } from "drizzle-orm";
import { accountsTable } from "../schemas/accounts";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type NewAccount = typeof accountsTable.$inferInsert;

const insert = async (db: NodePgDatabase, account: NewAccount) => {
  const result = await db
    .insert(accountsTable)
    .values(account)
    .returning({ number: accountsTable.number });

  if (!result) {
    throw new Error("create account record failed");
  }

  return result[0];
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
