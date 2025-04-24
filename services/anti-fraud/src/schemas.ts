import { z } from "zod";

export const transactionValidateMessage = z.object({
  number: z.coerce.bigint().positive(),
  transaction_id: z.string(),
  debit_account_id: z.coerce.bigint().positive(),
  credit_account_id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  scale: z.coerce.number().positive(),
  ledger: z.coerce.number().positive(),
  code: z.coerce.number().positive(),
  creation_date: z.string(),
});

export type TransactionValidateMessage = z.infer<
  typeof transactionValidateMessage
>;

const TRANSACTION_STATUS = ["approved", "rejected", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export const fraudTransactionVeridict = z
  .object({
    status: z.enum(TRANSACTION_STATUS),
  })
  .merge(transactionValidateMessage)
  .partial({
    scale: true,
    creation_date: true,
  });

export type FraudTransactionVeridict = z.infer<typeof fraudTransactionVeridict>;

export type FraudTransactionVeridictMessage =
  | FraudTransactionVeridict
  | {
      number: string;
      debit_account_id: string;
      credit_account_id: string;
      amount: string;
    };
