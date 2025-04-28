import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { UserModel } from "@users/schemas";

import { transactions } from "@db/queries/transactions";

import {
  getTransactionRequest,
  getTransactionReponse,
} from "@transactions/schemas";

const getTransaction = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/:transaction_id",
    {
      schema: {
        params: getTransactionRequest,
        response: {
          200: getTransactionReponse,
        },
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");

      const result = await transactions
        .getTransaction(app.pgdb, user.id, req.params.transaction_id)
        .then((results) => {
          return { transactions: results, error: undefined };
        })
        .catch((e: Error) => {
          console.error(e);

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

      res.code(200);
      return result.transactions[0];
    },
  );
};

export { getTransaction };
