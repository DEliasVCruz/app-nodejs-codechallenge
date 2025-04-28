import type {
  FastifyInstance,
  RouteOptions,
  FastifyPluginCallback,
} from "fastify";
import { createAccount } from "./create_account";
import { listAccounts } from "./list_accounts";
import { getAccount } from "./get_account";
import { listAccountTransactions } from "./list_account_transactions";

export const routes = [
  createAccount,
  listAccounts,
  getAccount,
  listAccountTransactions,
] as any as FastifyPluginCallback[];

export const router = async (app: FastifyInstance, _: RouteOptions) => {
  routes.forEach((route) => {
    app.register(route, { prefix: "/accounts" });
  });
};
