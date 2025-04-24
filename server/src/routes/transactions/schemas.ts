import { z } from "zod";

const MAX_ACCOUN_NAMET_LENGTH = 120;

const USER_ACCOUNT_STATUS = ["pending", "enabled"] as const;

export const createAccountRequest = z.object({
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    })
    .trim()
    .nonempty()
    .max(MAX_ACCOUN_NAMET_LENGTH, {
      message: `Account name can't be over ${MAX_ACCOUN_NAMET_LENGTH} characters`,
    }),
  type: z.enum(["savings", "personal_credit", "credit_line"], {
    required_error: "Account type is required",
  }),
  currency: z.enum(["usd", "pen"], {
    required_error: "Currency type is required",
  }),
});

export const userAccountCreationSuccess = z.object({
  message: z.string(),
  status: z.enum(USER_ACCOUNT_STATUS),
});

// export const getAccountRequest;
