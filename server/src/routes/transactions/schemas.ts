import { z } from "zod";

export const TRANSACTION_STATUS = ["pending", "approved", "rejected"] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

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

export const transactionRequestFailed = z.object({
  message: z.string(),
});

export const listUserTransactionsCursor = z.object({
  creation_date: z.coerce.date(),
  number: z.string(),
});

export type UserTransactionsListCursor = z.infer<
  typeof listUserTransactionsCursor
>;

export const getTransactionRequest = z.object({
  transaction_id: z.string(),
});

export const getTransactionReponse = z.object({
  id: z.string(),
  number: z.string(),
  value: z.number(),
  creation_date: z.date(),
  status: z.enum(TRANSACTION_STATUS),
  opertaion_name: z.string(),
  credit_account_id: z.string(),
  debit_account_id: z.string(),
  credit_account_number: z.string(),
  debit_account_number: z.string(),
  credit_account_name: z.string(),
  debit_account_name: z.string(),
  account_type_name: z.string(),
  currency: z.string(),
  balance_type: z.string(),
  update_date: z.date().nullable(),
  account_id: z.string(),
});

export const listTransactionsQueryParams = z.object({
  page_size: z.number().min(2).optional().default(10),
  start_key: z.string().optional(),
});

const listTransactionsElement = z.object({
  id: z.string(),
  number: z.string(),
  value: z.number(),
  creation_date: z.date(),
  status: z.enum(TRANSACTION_STATUS),
  opertaion_name: z.string(),
  credit_account_id: z.string(),
  debit_account_id: z.string(),
  currency: z.string(),
  balance_type: z.string(),
  account_id: z.string(),
});

export const listTransactionsRsponse = z.object({
  transactions: z.array(listTransactionsElement),
  next: z.string().optional(),
});

export const listAccountTransactionsRsponse = z.object({
  transactions: z.array(
    z
      .object({
        account_id: z.string(),
      })
      .merge(listTransactionsElement),
  ),
  next: z.string().optional(),
});
