import { z } from "zod";

const MAX_ACCOUNT_NAME_LENGTH = 120;
const MAX_ACCOUNT_NUMER_LENGTH = 9;

const USER_ACCOUNT_STATUS = ["pending", "enabled"] as const;
const ACCOUNT_CURRENCY_TYPES = ["pen", "usd"] as const;
const USER_ACCOUNT_TYPES = [
  "savings",
  "personal_credit",
  "credit_line",
] as const;

export type UserAccountType = (typeof USER_ACCOUNT_TYPES)[number];
export type UserAccountCurrency = (typeof ACCOUNT_CURRENCY_TYPES)[number];

export const getAccountTypeIdByName = (type: UserAccountType) => {
  return USER_ACCOUNT_TYPES.indexOf(type);
};

export const getAccountLedgerByCurrencyName = (type: UserAccountCurrency) => {
  return 1000 + ACCOUNT_CURRENCY_TYPES.indexOf(type);
};

export const createAccountRequest = z.object({
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
  type: z.enum(USER_ACCOUNT_TYPES, {
    required_error: "Account type is required",
  }),
  currency: z.enum(ACCOUNT_CURRENCY_TYPES, {
    required_error: "Currency type is required",
  }),
});

export const userAccountCreationSuccess = z.object({
  message: z.string(),
  status: z.enum(USER_ACCOUNT_STATUS),
  account_id: z.number().max(MAX_ACCOUNT_NUMER_LENGTH),
});

export const userAccountCreationFailed = z.object({
  message: z.string(),
});

export const userAccountResponseModel = z.object({
  account_number: z.number(),
  currency: z.enum(ACCOUNT_CURRENCY_TYPES),
  balance: z.number(),
  type: z.enum(USER_ACCOUNT_TYPES),
  max_balance: z.nullable(z.number()),
  name: z.string(),
});

export const getAccountRequest = z.object({
  account_number: z.number(),
});
