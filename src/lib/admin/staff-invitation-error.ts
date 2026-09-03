type SupabaseInvitationError = {
  code?: string;
  message?: string;
  status?: number;
};

function includesAny(value: string, fragments: string[]) {
  return fragments.some((fragment) => value.includes(fragment));
}

/**
 * Convert Supabase Auth invitation failures into safe, actionable guidance.
 * The original error is still logged by the server action for diagnosis.
 */
export function getStaffInvitationErrorMessage(error: SupabaseInvitationError | null): string {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (
    includesAny(code, ["email_exists", "user_already_exists"]) ||
    includesAny(message, ["already been registered", "already registered", "already exists"])
  ) {
    return "That email already has a Supabase Auth account and cannot be invited again. Check Authentication → Users in Supabase before retrying.";
  }

  if (
    error?.status === 429 ||
    includesAny(code, ["over_email_send_rate_limit", "rate_limit"]) ||
    includesAny(message, ["rate limit", "too many requests"])
  ) {
    return "Supabase’s invitation email limit has been reached. Wait a few minutes, then try again.";
  }

  if (
    includesAny(code, ["email_address_invalid", "email_provider_disabled"]) ||
    includesAny(message, ["invalid email", "email address is invalid"])
  ) {
    return "Supabase rejected this email address. Check the address and your Auth email-provider settings, then try again.";
  }

  if (
    includesAny(code, ["email_not_confirmed", "unexpected_failure"]) ||
    includesAny(message, ["smtp", "send email", "sending confirmation email"])
  ) {
    return "Supabase could not send the invitation email. Check the Auth email and SMTP settings, then try again.";
  }

  return "Supabase could not create this invitation. Check the Auth logs for the specific error, then try again.";
}
