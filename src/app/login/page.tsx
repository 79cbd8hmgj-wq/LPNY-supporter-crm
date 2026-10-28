import { StaffEmailLogin } from "./staff-email-login";

const errorMessages: Record<string, string> = {
  "not-authorized": "This account does not have active CRM access.",
  "invalid-recovery": "This password recovery link is invalid or expired.",
  "invalid-invitation": "This staff invitation link is invalid or expired. Ask an administrator to send a new invitation.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Staff sign in</h1>
      <p className="mt-2 text-sm text-lp-600">
        Enter your staff email to receive a one-time code. An authenticator app is still required for CRM access.
      </p>
      {errorMessage ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <StaffEmailLogin />
    </main>
  );
}
