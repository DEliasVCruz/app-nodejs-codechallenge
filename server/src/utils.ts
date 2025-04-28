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

export const scaleAndTruncate = (value: BigInt, scale: number): number => {
  const parsed = value.toString();

  const padded = parsed.padStart(scale + 1, "0");

  const whole = padded.slice(0, padded.length - scale);
  const frac = padded.slice(padded.length - scale);

  const twoDigits = frac.slice(0, 2).padEnd(2, "0");

  const finalStr = `${whole}.${twoDigits}`;
  return Number(finalStr);
};
