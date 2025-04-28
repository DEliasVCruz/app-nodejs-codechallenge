import type { FastifyInstance, RouteOptions } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { UserModel } from "@users/schemas";

import z from "zod";

import { listUserAccountsCursor } from "@accounts/schemas";
import { parseJsonPreprocessor } from "@/utils";
import { accounts } from "@db/queries/accounts";

const listAccounts = async (app: FastifyInstance, _: RouteOptions) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  route.get(
    "/",
    {
      schema: {
        querystring: z.object({
          currency: z.enum(["pen", "usd"]).optional(),
          type: z.enum(["debit", "credit"]).optional(),
          page_size: z.number().min(2).optional().default(10),
          start_key: z.string().optional(),
        }),
      },
    },
    async (req, res) => {
      const user = req.getDecorator<UserModel>("user");

      let currency = req.query.currency;
      let type = req.query.type;

      const schemaChecker = z.preprocess(
        parseJsonPreprocessor,
        listUserAccountsCursor,
      );

      const startKey = req.query.start_key;

      const decoded = Buffer.from(startKey ?? "", "base64").toString("utf8");
      const parsed = schemaChecker.safeParse(decoded);

      if (parsed.success) {
        currency = parsed.data.currency;
        type = parsed.data.type;
      } else if (req.query.start_key) {
        console.log("malformed_cursor_string_received");
      }

      const result = await accounts
        .listUserAccounts(
          app.pgdb,
          user.id,
          req.query.page_size,
          type,
          currency,
          parsed.success
            ? {
                ledger_id: parsed.data.ledger_id,
                creation_date: parsed.data.craetion_date,
                number: parsed.data.number,
              }
            : undefined,
        )
        .then((results) => {
          return { accounts: results, error: undefined };
        })
        .catch((e: Error) => {
          console.log("list_account_matches_not_found");

          return { accounts: [], error: e };
        });

      if (result.error) {
        res.code(500);

        return;
      }

      if (!result.accounts.length) {
        res.code(404);

        return;
      }

      if (result.accounts.length <= req.query.page_size) {
        res.code(200);
        return { accounts: result.accounts };
      }

      const lastHit = result.accounts[result.accounts.length - 2];
      if (!lastHit) {
        res.code(200);
        return { accounts: result.accounts };
      }

      const nextKey = {
        currency: lastHit.currency,
        type: lastHit.type,
        ledger_id: lastHit.ledger_id,
        craetion_date: lastHit.creation_date,
        number: lastHit.number,
      };

      const nextCursor = Buffer.from(JSON.stringify(nextKey), "utf8").toString(
        "base64",
      );

      res.code(200);
      return { accounts: result.accounts, next: nextCursor };
    },
  );
};

export { listAccounts };
