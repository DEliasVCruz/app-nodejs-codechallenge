import type {
  FastifyInstance,
  RouteOptions,
  FastifyPluginCallback,
} from "fastify";
import { create_account } from "./create_account";
import { list_accounts } from "./list_accounts";
import { get_account } from "./get_account";

export const routes = [
  create_account,
  list_accounts,
  get_account,
] as any as FastifyPluginCallback[];

export const router = async (app: FastifyInstance, _: RouteOptions) => {
  routes.forEach((route) => {
    app.register(route, { prefix: "/accounts" });
  });
};
