import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

const list_accounts = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/",
    {
      schema: {
        querystring: z.object({
          currency: z.enum(["pen", "usd"]),
          type: z.enum(["savings", "personal_credit", "credit_line"]),
        }),
      },
    },
    async (req, res) => {
      // Here we get list an account dire tly from the database

      res.code(200);
      res.send([
        {
          id: 1234234,
          currency: req.query.currency,
          type: req.query.type,
        },
        {
          id: 1234235,
          currency: req.query.currency,
          type: req.query.type,
        },
      ]);
    },
  );
};

export { list_accounts };
