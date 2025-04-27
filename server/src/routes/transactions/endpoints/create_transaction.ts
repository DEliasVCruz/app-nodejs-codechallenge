import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { UserModel } from "@users/schemas";

import { z } from "zod";

import { userAccuntIDParam } from "@accounts/schemas";

import { getTransactionAccount } from "@transactions/functions/create_transaction";

import {
  createTransactionRequest,
  transactionCreationAccepted,
  transactionRequestFailed,
} from "@transactions/schemas";

const create_transaction = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post(
    "/:account_id/transfer",
    {
      schema: {
        body: createTransactionRequest,
        params: userAccuntIDParam,
        response: {
          201: transactionCreationAccepted,
          400: z.undefined(),
          500: transactionRequestFailed,
        },
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

      const producer = app.kafka.producer();

      const message = {
        number: req.body.id.toString(),
        debit_account_id: req.body.debit_account_number.toString(),
        credit_account_id: req.body.credit_account_number.toString(),
        amount: req.body.value.toString(),
        code: req.body.operation_id,
        ledger: account.ledger_id,
      };

      try {
        await producer.connect();
        await producer.send({
          topic: "transfer-request",
          messages: [{ value: JSON.stringify(message) }],
        });

        await producer.disconnect();
      } catch {
        res.code(500);
        res.send({
          message: "transaction request failed",
        });

        return;
      }

      res.code(201);
      res.send({
        message: "transaction request accepted",
        status: "requested",
      });
    },
  );
};

export { create_transaction };
