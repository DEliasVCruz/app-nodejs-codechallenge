import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

const get_account = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z
            .string()
            .max(9)
            .transform((val, ctx) => {
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
        }),
      },
    },
    async (req, res) => {
      // Here we get an account dire tly from the database

      res.code(200);
      res.send({
        id: req.params.id,
      });
    },
  );
};

export { get_account };
