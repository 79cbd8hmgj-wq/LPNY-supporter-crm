import { loginAction } from "./actions";

const errorMessages: Record<string, string> = {
  "invalid-input": "Enter a valid email address and password.",
  "invalid-credentials": "The email or password was not accepted.",
  "not-authorized": "This account does not have active CRM access.",
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
      <p className="mt-2 text-sm text-lp-600">Staff accounts are invitation-only.</p>
      {errorMessage ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form action={loginAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2"
            name="password"
            type="password"
            required
          />
        </label>
        <button className="w-full rounded-md bg-lp-900 p-2 font-medium text-white" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
