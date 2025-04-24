import { z } from "zod";

export const transferRequestMessage = z.object({
  id: z.coerce.bigint().positive(),
  debit_account_id: z.coerce.bigint().positive(),
  credit_account_id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  code: z.coerce.number().positive(),
  ledger: z.number().positive(),
});
