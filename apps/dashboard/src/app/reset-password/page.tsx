"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { PasswordInput } from '@/components/PasswordInput';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    setReady(true);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (token && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (token) {
        await apiPost('/auth/password-reset/confirm', { token, password });
        localStorage.removeItem('nyumbaops_token');
        localStorage.removeItem('nyumbaops_token_user');
        setMessage('Password updated. Please sign in again.');
      } else {
        await apiPost('/auth/password-reset/request', { email: email.trim() });
        setMessage('If this account exists, a reset link has been sent.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">{token ? 'Choose a new password.' : 'We will email you a private reset link.'}</p>
        </div>
        {!ready ? <p className="text-sm text-gray-600">Loading…</p> : message ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
            <Link href="/login" className="font-semibold text-teal-700">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {token ? (
              <>
                <label htmlFor="new-password" className="block text-sm font-medium">New password</label>
                <PasswordInput id="new-password" value={password} onChange={setPassword} required autoComplete="new-password" />
                <p className="text-xs text-gray-500">Use at least 12 characters.</p>
                <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm password</label>
                <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} required autoComplete="new-password" />
              </>
            ) : (
              <>
                <label htmlFor="email" className="block text-sm font-medium">Account email</label>
                <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black" />
              </>
            )}
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading || (Boolean(token) && password.length < 12)} className="w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
              {loading ? 'Please wait…' : token ? 'Set new password' : 'Email reset link'}
            </button>
            <Link href="/login" className="block text-center text-sm font-medium text-teal-700">Back to sign in</Link>
          </form>
        )}
      </div>
    </main>
  );
}
