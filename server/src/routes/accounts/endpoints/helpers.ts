import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { UserModel } from "@users/schemas";

import { getAccountTyepById } from "@accounts/schemas";

import { accounts } from "@db/queries/accounts";

type TransactionAccountRequest = {
  user: UserModel;
  id: string;
  debit_account_number: BigInt;
  credit_account_number: BigInt;
};

export const getTransactionAccount = async (
  db: NodePgDatabase,
  req: TransactionAccountRequest,
) => {
  const debit_account_number = req.debit_account_number.toString();
  const credit_account_number = req.credit_account_number.toString();

  const account = await accounts
    .getWithUserAccountNumbers(
      db,
      req.user.id,
      req.id,
      debit_account_number,
      credit_account_number,
    )
    .then((result) => {
      return { ...result };
    })
    .catch(() => {
      return undefined;
    });

  if (!account) throw new Error("account not found");

  const account_type = getAccountTyepById(account.account_type);
  if (!account_type) throw new Error("un tracked account type");

  const account_balance_type = account_type == "savings" ? "debit" : "credit";

  // Cant ask to debit from the same debit account that reqauested it
  if (
    account_balance_type == "debit" &&
    account.account_number == debit_account_number
  )
    throw new Error("can't debit to own account");

  // Cant ask to credit from the same credit account that reqauested it
  if (
    account_balance_type == "credit" &&
    account.account_number == credit_account_number
  )
    throw new Error("can't credit to own account");

  return account;
};
