import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { UserModel } from "@users/schemas";

import { transactions } from "@db/queries/transactions";

import { userAccuntIDParam } from "@accounts/schemas";

import {
  listUserTransactionsCursor,
  listTransactionsQueryParams,
  listAccountTransactionsRsponse,
} from "@transactions/schemas";
import { parseJsonPreprocessor } from "@/utils";

import z from "zod";

const listAccountTransactions = async (
  app: FastifyInstance,
  _: RouteOptions,
) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/:account_id/transactions",
    {
      schema: {
        params: userAccuntIDParam,
        querystring: listTransactionsQueryParams,
        response: {
          200: listAccountTransactionsRsponse,
        },
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");

      const schemaChecker = z.preprocess(
        parseJsonPreprocessor,
        listUserTransactionsCursor,
      );

      const startKey = req.query.start_key;

      const decoded = Buffer.from(startKey ?? "", "base64").toString("utf8");
      const parsed = schemaChecker.safeParse(decoded);

      if (!parsed.success && req.query.start_key) {
        console.log("malformed_cursor_string_received");
      }

      const result = await transactions
        .listUserTransactions(
          app.pgdb,
          user.id,
          req.query.page_size,
          req.params.account_id,
          parsed.data,
        )
        .then((results) => {
          return { transactions: results, error: undefined };
        })
        .catch((e: Error) => {
          console.log("list_account_matches_not_found");

          return { transactions: [], error: e };
        });

      if (result.error) {
        res.code(500);

        return;
      }

      if (!result.transactions.length) {
        res.code(404);

        return;
      }

      if (result.transactions.length <= req.query.page_size) {
        res.code(200);
        return { transactions: result.transactions };
      }

      const lastHit = result.transactions[result.transactions.length - 2];
      if (!lastHit) {
        res.code(200);
        return { transactions: result.transactions };
      }

      const nextKey = {
        creation_date: lastHit.creation_date,
        number: lastHit.number,
      };

      const nextCursor = Buffer.from(JSON.stringify(nextKey), "utf8").toString(
        "base64",
      );

      res.code(200);
      return { transactions: result.transactions, next: nextCursor };
    },
  );
};

export { listAccountTransactions };
