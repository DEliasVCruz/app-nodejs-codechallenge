import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import {
  createAccountRequest,
  userAccountCreationAccepted,
  userAccountCreationFailed,
  getOperationByAccountTypeId,
} from "@accounts/schemas";
import { createUserAccount } from "@accounts/functions/create_account";

import type { UserModel } from "@users/schemas";

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

      const account = await createUserAccount(app.pgdb, {
        account_name: req.body.name,
        currency: req.body.currency,
        type: req.body.type,
        user_id: user.id,
      });
      if (account == undefined) {
        res.code(500);

        return { message: "failed to create account" };
      }

      const producer = app.kafka.producer();

      const request = {
        number: account.account_number.toString(),
        ledger: account.ledger_id,
        operation: getOperationByAccountTypeId(account.account_type_id),
      };

      try {
        await producer.connect();
        await producer.send({
          topic: "account-create",
          messages: [{ value: JSON.stringify(request) }],
        });

        await producer.disconnect();
      } catch {
        res.code(500);

        return { message: "failed to create account" };
      }

      res.code(201);

      return {
        message: "account creation request accepted",
        status: "pending",
      };
    },
  );
};

export { create_account };
