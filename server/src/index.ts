import "dotenv/config";

import auth, { type FastifyAuthFunction } from "@fastify/auth";
import bearerAuthPlugin from "@fastify/bearer-auth";

import { fastify, type FastifyPluginCallback } from "fastify";

import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { router as accountsRouter } from "@server/accounts";
import { router as transactionsRouter } from "@server/transactions";

const app = fastify({
  logger: true,
});

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.decorateRequest("user", null);

app.register(fp(drizzelPGPlugin, { name: "drizzel-pg-plugin" }), {
  postgresqlDB: process.env.DATABASE_URL ?? "",
});

app
  .register(auth)
  .register(bearerAuthPlugin, {
    addHook: false,
    keys: new Set([]),
    auth: (key, req) => {
      const admin_key = process.env.ADMIN_KEY ?? "";
      if (!admin_key) {
        return false;
      }

      if (key != admin_key) {
        return false;
      }

      req.setDecorator<UserModel>("user", {
        name: "User Admin 1",
        id: process.env.ADMIN_USER_ID ?? "",
        role: "admin",
      });

      return true;
    },
    verifyErrorLogLevel: "debug",
  })
  .after(() => {
    const verifyBearerAuth =
      app.getDecorator<FastifyAuthFunction>("verifyBearerAuth");

    app.addHook("preHandler", app.auth([verifyBearerAuth]));
  });

const routes = [
  accountsRouter,
  transactionsRouter,
] as any as FastifyPluginCallback[];

routes.forEach((route) => {
  app.register(route, { prefix: "/api" });
});

app.listen({ port: 3000 }, (err, addr) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  console.log(`Server listening at ${addr}`);
});
