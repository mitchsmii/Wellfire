import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  theme: 'dark' | 'light';
}

export default function AuthPage({ theme }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#faf7f2] dark:bg-[#0f0e0c] flex items-center justify-center px-4 transition-colors duration-300">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <svg viewBox="0 0 28 28" fill="none" className="w-10 h-10">
              <path
                d="M14 3C14 3 8 9 8 15a6 6 0 0012 0c0-3-2-5-2-5s-.5 2.5-2 3.5C17 11 14 3 14 3z"
                fill="url(#flame-auth)"
              />
              <defs>
                <linearGradient id="flame-auth" x1="14" y1="3" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Wellfire
            </span>
            <p className="text-sm text-stone-400 dark:text-stone-600">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-stone-200/50 dark:border-stone-700/30 bg-white dark:bg-stone-900/40 text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-amber-400/50 dark:focus:border-amber-500/30 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-stone-200/50 dark:border-stone-700/30 bg-white dark:bg-stone-900/40 text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-amber-400/50 dark:focus:border-amber-500/30 transition-colors"
            />

            {error && (
              <p className="text-xs text-rose-500 dark:text-rose-400 px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          {/* Toggle */}
          <p className="mt-6 text-center text-xs text-stone-400 dark:text-stone-600">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 font-semibold transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
