import { z } from "zod";

export const supporterEmailSchema = z.string().trim().email();

export type SupporterContext = {
  authUserId: string;
  personId: string;
};

export const supporterSignInGenericMessage =
  "If that email is linked to an LPNY supporter profile, a secure sign-in link has been sent.";
