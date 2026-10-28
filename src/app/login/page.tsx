import { StaffEmailLogin } from "./staff-email-login";
import { loginAction } from "./actions";

const errorMessages: Record<string, string> = {
  "invalid-input": "Enter a valid email and password.",
  "invalid-credentials": "The email or password was not accepted.",
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
      <details className="mt-6 border-t border-lp-300 pt-4">
        <summary className="cursor-pointer text-sm underline">Use an existing staff password instead</summary>
        <form action={loginAction} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Email
            <input className="mt-1 w-full rounded-md border border-lp-300 p-2" type="email" name="email" autoComplete="email" required />
          </label>
          <label className="block text-sm font-medium">Password
            <input className="mt-1 w-full rounded-md border border-lp-300 p-2" type="password" name="password" autoComplete="current-password" required />
          </label>
          <button className="w-full rounded-md bg-lp-900 p-2 text-white" type="submit">Sign in with password</button>
        </form>
      </details>
    </main>
  );
}
