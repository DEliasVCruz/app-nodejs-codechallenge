import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

const list_transactions = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/",
    {
      schema: {
        querystring: z.object({
          account_number: z
            .optional(z.string().max(9))
            .transform((val, ctx) => {
              if (!val) {
                return z.NEVER;
              }

              const parsed = parseInt(val);

              if (isNaN(parsed)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Not an account number",
                });

                // This is a special symbol you can use to
                // return early from the transform function.
                // It has type `never` so it does not affect the
                // inferred return type.
                return z.NEVER;
              }

              return parsed;
            }),
          type: z.optional(
            z.enum(["savings", "personal_credit", "credit_line"]),
          ),
          currency: z.optional(z.enum(["pen", "usd"])),
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

export { list_transactions };
