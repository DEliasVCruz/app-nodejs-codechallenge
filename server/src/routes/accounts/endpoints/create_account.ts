import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 22);

import {
  createAccountRequest,
  userAccountCreationAccepted,
  userAccountCreationFailed,
  getOperationByAccountTypeId,
  getAccountTypeIdByName,
  getAccountLedgerByCurrencyName,
  accountFlagsByAccountType,
  ACCOUNTS_CREATE_RPC_DECORATOR,
} from "@accounts/schemas";
import { accounts } from "@db/queries/accounts";

import type { UserModel } from "@users/schemas";

import type { AccountCreateRpcClient } from "@accounts/schemas";

const create_account = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post(
    "/",
    {
      schema: {
        body: createAccountRequest,
        response: {
          201: userAccountCreationAccepted,
          500: userAccountCreationFailed,
        },
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");
      const rpc = req.getDecorator<AccountCreateRpcClient>(
        ACCOUNTS_CREATE_RPC_DECORATOR,
      );

      const accountTypeId = getAccountTypeIdByName(req.body.type);
      const ledger = getAccountLedgerByCurrencyName(req.body.currency);
      const account_number = req.body.number.toString();

      const payload = {
        number: account_number,
        ledger: ledger,
        operation: getOperationByAccountTypeId(accountTypeId),
        flags: accountFlagsByAccountType(req.body.type),
      };

      const response = await rpc
        .request(payload)
        .then((rsp) => {
          return rsp;
        })
        .catch((e: Error) => {
          console.log(e);
        });

      if (!response) {
        res.code(500);

        return { message: "failed to create account" };
      }

      const account = await accounts
        .insertUserAccount(app.pgdb, {
          name: req.body.name,
          user_id: user.id,
          id: nanoid(),
          ledger_id: ledger,
          number: account_number,
          account_type_id: accountTypeId,
        })
        .onConflictDoNothing()
        .then((account) => {
          console.log("user_account_created");
          return account;
        })
        .catch((e: Error) => {
          console.error(e);
        });

      if (!account) {
        res.code(500);

        return { message: "failed to create account" };
      }

      res.code(201);

      return account[0];
    },
  );
};

export { create_account };
