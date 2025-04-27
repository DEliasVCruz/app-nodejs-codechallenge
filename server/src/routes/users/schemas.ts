import { z } from "zod";

const USER_ROLES = ["admin", "customer", "agent"] as const;

export const userModel = z.object({
  name: z.string().nonempty(),
  id: z.string().nonempty(),
  email: z.optional(z.string()),
  phone: z.optional(
    z.object({
      country_code: z.optional(z.number()).default(51),
      number: z.number(),
    }),
  ),
  role: z.enum(USER_ROLES),
});

export type UserModel = z.infer<typeof userModel>;
