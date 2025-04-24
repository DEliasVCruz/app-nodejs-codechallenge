import { z } from "zod";

export const transactionValidateMessage = z.object({
  id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  code: z.coerce.number().positive(),
  scale: z.number().positive(),
});

export type TransactionValidateMessage = z.infer<
  typeof transactionValidateMessage
>;

const TRANSACTION_STATUS = ["approved", "rejected"] as const;
type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export type FraudTransactionVeridictEvent = {
  id: string;
  amount: string;
  code: number;
  status: TransactionStatus;
};
