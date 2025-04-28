import { z } from "zod";

import type { KafkaRpcClient } from "@/broker/rpc";

export const MAX_ACCOUNT_NAME_LENGTH = 255;
export const MAX_ACCOUNT_NUMER_LENGTH = 22;

const ACCOUNT_CURRENCY_TYPES = ["pen", "usd"] as const;
const ACCOUNT_TYPES = ["savings", "personal_credit", "credit_line"] as const;

export const ACCOUNTS_CREATE_RPC_DECORATOR = "accountsCreate";

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type UserAccountCurrency = (typeof ACCOUNT_CURRENCY_TYPES)[number];

const ACCOUNT_FLAGS_BY_TYPE: Record<AccountType, number> = {
  savings: 4,
  credit_line: 2,
  personal_credit: 2,
};

export const ACCOUNT_STATUS = ["enabled", "disabled", "blocked"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUS)[number];

export const getAccountTypeIdByName = (type: AccountType) => {
  return ACCOUNT_TYPES.indexOf(type) + 1;
};

export const getAccountTyepById = (type: number) => {
  return ACCOUNT_TYPES[type - 1];
};

export const getOperationByAccountTypeId = (typeId: number) => {
  return 2000 + typeId;
};

export const accountFlagsByAccountType = (type: AccountType) => {
  return ACCOUNT_FLAGS_BY_TYPE[type];
};

export const getAccountLedgerByCurrencyName = (type: UserAccountCurrency) => {
  return 1000 + ACCOUNT_CURRENCY_TYPES.indexOf(type) + 1;
};

export const createAccountRequest = z.object({
  number: z.coerce.bigint().gt(0n, "account number must be non 0"),
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    })
    .trim()
    .nonempty()
    .max(MAX_ACCOUNT_NAME_LENGTH, {
      message: `Account name can't be over ${MAX_ACCOUNT_NAME_LENGTH} characters`,
    }),
  type: z.enum(ACCOUNT_TYPES, {
    required_error: "Account type is required",
  }),
  currency: z.enum(ACCOUNT_CURRENCY_TYPES, {
    required_error: "Currency type is required",
  }),
});

export type AccountCreateRpcRequest = {
  number: string;
  ledger: number;
  operation: number;
  flags: number;
};

export const accountCreateRpcResponse = z.object({
  account_number: z.string(),
});

export type AccountCreateRpcResponse = z.infer<typeof accountCreateRpcResponse>;

export type AccountCreateRpcClient = KafkaRpcClient<
  AccountCreateRpcRequest,
  AccountCreateRpcResponse
>;

export const userAccountCreationSucceeded = z.object({
  id: z.string(),
  name: z.string(),
  number: z.string(),
  creation_date: z.date(),
  status: z.enum(ACCOUNT_STATUS),
});

export const userAccountCreationFailed = z.object({
  message: z.string(),
});

export const userAccuntIDParam = z.object({
  account_id: z.string().max(MAX_ACCOUNT_NUMER_LENGTH),
});

export const userAccountResponseModel = z.object({
  id: z.string(),
  number: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.number(),
  balance_type: z.string(),
  currency: z.string(),
  creation_date: z.date(),
  update_date: z.date().nullable(),
  max_balance: z.number().nullable(),
  status: z.enum(ACCOUNT_STATUS),
});

export const listUserAccountsCursor = z.object({
  currency: z.enum(["pen", "usd"]).optional(),
  type: z.enum(["debit", "credit"]).optional(),
  ledger_id: z.number(),
  craetion_date: z.coerce.date(),
  number: z.string(),
});

export const listAccountsQueryParams = z.object({
  currency: z.enum(["pen", "usd"]).optional(),
  type: z.enum(["debit", "credit"]).optional(),
  page_size: z.number().min(2).optional().default(10),
  start_key: z.string().optional(),
});

export const listAccountsResponse = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      name: z.string(),
      type: z.string(),
      balance: z.number(),
      currency: z.string(),
      status: z.enum(ACCOUNT_STATUS),
      ledger_id: z.number(),
      creation_date: z.date(),
    }),
  ),
  next: z.string().optional(),
});
