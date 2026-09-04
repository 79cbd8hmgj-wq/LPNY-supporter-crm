import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
    <h1 className="text-2xl font-semibold">Reset your password</h1>
    <p className="mt-2 text-sm text-lp-600">Enter your staff email address. Recovery links expire and can only be used once.</p>
    <ForgotPasswordForm />
    <Link className="mt-4 text-center text-sm font-medium underline" href="/login">Back to sign in</Link>
  </main>;
}
