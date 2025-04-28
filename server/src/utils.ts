import "dotenv/config";

import { z, ZodIssueCode } from "zod";

export const buildDatabaseURL = () => {
  const pgUser = process.env.PG_USER || "postgres";
  const pgPassword = process.env.PG_USER || "postgres";
  const pgPort = process.env.PG_PORT || "5432";

  return `postgres://${pgUser}:${pgPassword}@postgres:${pgPort}/postgres`;
};

export const parseJsonPreprocessor = (value: any, ctx: z.RefinementCtx) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: (e as Error).message,
      });
    }
  }

  return value;
};
