import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import {
  createAccountRequest,
  userAccountCreationSuccess,
} from "@transactions/schemas";

const create_transaction = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.post(
    "/",
    {
      schema: {
        body: createAccountRequest,
        response: { 200: userAccountCreationSuccess },
      },
    },
    async (req, res) => {
      // We generate an account id an number
      // We create the accoutn in the database
      // We send the account account created to the -user-account topic
      // We add the account to the cache (we dont' fail if this errors out)

      res.code(200);
      res.send({
        message: `user account created with name ${req.body.name}`,
        status: "pending",
      });
    },
  );
};

export { create_transaction };
