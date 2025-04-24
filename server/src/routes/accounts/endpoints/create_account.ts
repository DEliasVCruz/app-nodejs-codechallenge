import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import {
  createAccountRequest,
  userAccountCreationSuccess,
  userAccountCreationFailed,
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
          201: userAccountCreationSuccess,
          500: userAccountCreationFailed,
        },
      },
    },
    async (req, res) => {
      // We generate an account id an number
      // We create the accoutn in the database
      // We send the account account created to the -user-account topic
      // We add the account to the cache (we dont' fail if this errors out)

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

      res.code(201);

      return {
        message: "account creation request accepted",
        status: "pending",
      };
    },
  );
};

export { create_account };
