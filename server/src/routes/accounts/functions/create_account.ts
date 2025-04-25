import { accounts } from "@db/queries/users";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { customAlphabet } from "nanoid";

import { id } from "@/vendor/tg_id";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 22);

import {
  type UserAccountType,
  type UserAccountCurrency,
  getAccountLedgerByCurrencyName,
  getAccountTypeIdByName,
} from "@accounts/schemas";

type CreateUserAccount = {
  user_id: string;
  account_name: string;
  type: UserAccountType;
  currency: UserAccountCurrency;
};

export const createUserAccount = async (
  db: NodePgDatabase,
  req: CreateUserAccount,
) => {
  const account_number = await accounts
    .insert(db, {
      name: req.account_name,
      user_id: req.user_id,
      id: nanoid(),
      ledger_id: getAccountLedgerByCurrencyName(req.currency),
      number: id().toString(),
      account_type_id: getAccountTypeIdByName(req.type),
    })
    .then((account) => {
      return {
        account_number: account.number,
        account_id: account.id,
        ledger_id: account.ledger_id,
        account_type_id: account.account_type_id,
      };
    })
    .catch(() => {
      return undefined;
    });

  return account_number;
};
