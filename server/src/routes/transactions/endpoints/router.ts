import type {
  FastifyInstance,
  RouteOptions,
  FastifyPluginCallback,
} from "fastify";
import { listTransactions } from "./list_transactions";
import { getTransaction } from "./get_transaction";

export const routes = [
  listTransactions,
  getTransaction,
] as any as FastifyPluginCallback[];

export const router = async (app: FastifyInstance, _: RouteOptions) => {
  routes.forEach((route) => {
    app.register(route, { prefix: "/transactions" });
  });
};
