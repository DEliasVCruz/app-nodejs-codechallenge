import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { UserModel } from "@users/schemas";

import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 22);

import { userAccuntIdParam } from "@accounts/schemas";
import { getTransactionAccount } from "@accounts/endpoints/helpers";
import { transactions } from "@db/queries/transactions";

import {
  accountTransferRequest,
  transactionCreated,
  transactionRequestFailed,
  type TransactionCreateRpcClient,
  TRANSACTIONS_CREATE_RPC_DECORATOR,
} from "@transactions/schemas";

import { scaleAndTruncate } from "@/utils";

const createAccountTransfer = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post(
    "/:account_id/transfer",
    {
      schema: {
        body: accountTransferRequest,
        params: userAccuntIdParam,
        response: {
          201: transactionCreated,
          500: transactionRequestFailed,
          400: transactionRequestFailed,
        },
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");
      const rpc = req.getDecorator<TransactionCreateRpcClient>(
        TRANSACTIONS_CREATE_RPC_DECORATOR,
      );

      const transactionAccount = await getTransactionAccount(app.pgdb, {
        user,
        id: req.params.account_id,
        debit_account_number: req.body.debit_account_number,
        credit_account_number: req.body.credit_account_number,
      })
        .then((account) => {
          return { account, err: undefined };
        })
        .catch((err: Error) => {
          return { account: undefined, err };
        });

      if (transactionAccount.err) {
        res.code(400);

        return { message: transactionAccount.err.message };
      }

      const account = transactionAccount.account;

      const payload = {
        id: nanoid(),
        number: req.body.id.toString(),
        debit_account_id: req.body.debit_account_number.toString(),
        credit_account_id: req.body.credit_account_number.toString(),
        amount: req.body.value.toString(),
        code: req.body.operation_id,
        ledger: account.ledger_id,
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

        return { message: "failed to create transaction" };
      }

      const value = scaleAndTruncate(response.amount, 6);

      const transaction = await transactions
        .insertTransactions(app.pgdb, [
          {
            id: payload.id,
            number: response.number.toString(),
            value,
            debit_account_number: response.debit_account_id.toString(),
            credit_account_number: response.credit_account_id.toString(),
            status: response.status,
            operation_id: response.code,
          },
        ])
        .onConflictDoNothing()
        .then((transaction) => {
          console.log("account_transaction_created");
          return transaction[0];
        })
        .catch((e: Error) => {
          console.error(e);
        });

      if (!transaction) {
        res.code(500);

        return { message: "failed to create account" };
      }

      res.code(201);

      return transaction;
    },
  );
};

export { createAccountTransfer };
