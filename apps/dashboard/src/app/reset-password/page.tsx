"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/auth/setup-password", {
        email: email.trim(),
        password,
        adminSecret: adminKey,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">
            <span className="text-gray-600">Nyumba</span>
            <span className="text-black">Ops</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">Reset your password</p>
        </div>

        {done ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700">
              Password updated for <span className="font-medium">{email}</span>. You can sign in now.
            </p>
            <Link
              href="/login"
              className="inline-block w-full rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-zinc-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                autoComplete="username"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-zinc-900">
                New password
              </label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={setPassword}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-zinc-900">
                Confirm new password
              </label>
              <PasswordInput
                id="confirm-password"
                value={confirm}
                onChange={setConfirm}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="admin-key" className="block text-sm font-semibold text-zinc-900">
                Admin key
              </label>
              <PasswordInput
                id="admin-key"
                value={adminKey}
                onChange={setAdminKey}
                required
                placeholder="Your private reset key"
              />
              <p className="mt-1 text-xs text-gray-500">
                The secret configured on the server (ADMIN_SETUP_SECRET).
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "Updating…" : "Set new password"}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
