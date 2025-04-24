import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { userAccuntIDParam } from "@accounts/schemas";

const get_account = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/:account_id",
    {
      schema: {
        params: userAccuntIDParam,
      },
    },
    async (req, res) => {
      // Here we get an account dire tly from the database

      res.code(200);
      res.send({
        id: req.params.account_id,
      });
    },
  );
};

export { get_account };
