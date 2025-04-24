import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { UserModel } from "@users/schemas";

import { z } from "zod";

import { userAccuntIDParam } from "@accounts/schemas";

import { getTransactionAccount } from "@transactions/functions/create_transaction";

import {
  createTransactionRequest,
  transactionCreationAccepted,
} from "@transactions/schemas";

const create_transaction = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post(
    "/:account_id/request",
    {
      schema: {
        body: createTransactionRequest,
        params: userAccuntIDParam,
        response: { 201: transactionCreationAccepted, 400: z.undefined() },
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");

      const account = await getTransactionAccount(app.pgdb, {
        user,
        id: req.params.account_id,
        debit_account_number: req.body.debit_account_number,
        credit_account_number: req.body.credit_account_number,
      });

      if (account == undefined) {
        res.code(400);

        return;
      }

      // send to kafka

      res.code(201);
      res.send({
        message: "transaction request accepted",
        status: "requested",
      });
    },
  );
};

export { create_transaction };
