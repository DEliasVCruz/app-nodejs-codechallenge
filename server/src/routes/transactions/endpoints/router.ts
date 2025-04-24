import type {
  FastifyInstance,
  RouteOptions,
  FastifyPluginCallback,
} from "fastify";
import { create_transaction } from "./create_transaction";
import { list_transactions } from "./list_transactions";
import { get_transaction } from "./get_transaction";

export const routes = [
  create_transaction,
  list_transactions,
  get_transaction,
] as any as FastifyPluginCallback[];

export const router = async (app: FastifyInstance, _: RouteOptions) => {
  routes.forEach((route) => {
    app.register(route, { prefix: "/transactions" });
  });
};
