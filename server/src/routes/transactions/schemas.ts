import { z } from "zod";

const TRANSACTION_STATUS = [
  "requested",
  "pending",
  "approved",
  "rejected",
] as const;

export const createTransactionRequest = z.object({
  id: z.coerce.bigint().positive(),
  debit_account_number: z.coerce.bigint().positive(),
  credit_account_number: z.coerce.bigint().positive(),
  value: z.coerce.bigint().positive(),
  operation_id: z.coerce.number().positive(),
});

export type TransactionRequest = z.infer<typeof createTransactionRequest>;

export const transactionCreationAccepted = z.object({
  message: z.string(),
  status: z.enum(TRANSACTION_STATUS),
});
