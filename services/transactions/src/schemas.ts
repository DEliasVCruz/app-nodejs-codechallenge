import { z } from "zod";

const TRANSACTION_STATUS = ["approved", "rejected"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export const transferRequestMessage = z.object({
  id: z.coerce.bigint().positive(),
  debit_account_id: z.coerce.bigint().positive(),
  credit_account_id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  code: z.coerce.number().positive(),
  ledger: z.number().positive(),
});

export type TransferRequest = z.infer<typeof transferRequestMessage>;

export type TransferCreated = TransferRequest & {
  creation_date: Date;
};

export const fraudTransactionVeridictEvent = z
  .object({
    status: z.enum(TRANSACTION_STATUS),
  })
  .merge(transferRequestMessage);

export type FraudTransactionVeridictEvent = z.infer<
  typeof fraudTransactionVeridictEvent
>;

export type TransferUpdate = TransferCreated & FraudTransactionVeridictEvent;
