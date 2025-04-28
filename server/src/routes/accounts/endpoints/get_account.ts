import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { UserModel } from "@users/schemas";

import { userAccuntIDParam, userAccountResponseModel } from "@accounts/schemas";

import { accounts } from "@db/queries/accounts";

const getAccount = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/:account_id",
    {
      schema: {
        params: userAccuntIDParam,
        response: {
          200: userAccountResponseModel,
        },
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");

      const result = await accounts
        .getUserAccount(app.pgdb, user.id, req.params.account_id)
        .then((accounts) => {
          return { accounts: accounts, error: undefined };
        })
        .catch((e: Error) => {
          console.error(e);

          return { value: [], error: e };
        });

      if (result.error) {
        res.code(500);

        return;
      }

      if (result.accounts.length) {
        res.code(404);

        return;
      }

      res.code(200);
      return result.accounts[0];
    },
  );
};

export { getAccount };
