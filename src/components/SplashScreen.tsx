/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthUser } from '../types/auth';
import { authService } from '../services/authService';
import { Wine, AlertCircle, X, Mail, Eye, EyeOff, CheckCircle2, Check } from 'lucide-react';
import { HeroBackground } from './ui/HeroBackground';

interface SplashScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

type EmailAuthMode = 'signin' | 'signup' | 'reset';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAuthenticated }) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'email' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email & Password Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailAuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setLoadingProvider('google');
      const user = await authService.signInWithGoogle();
      onAuthenticated(user);
    } catch (e: any) {
      setAuthError(e?.message || 'Unable to sign in with Google. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleOpenEmailModal = (initialMode: EmailAuthMode = 'signin') => {
    setAuthError(null);
    setModalError(null);
    setResetSuccessMessage(null);
    setEmailMode(initialMode);
    setIsEmailModalOpen(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setResetSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setModalError('Please enter a valid email address.');
      return;
    }

    if (emailMode === 'reset') {
      try {
        setLoadingProvider('email');
        await authService.resetPassword(trimmedEmail);
        setResetSuccessMessage(`Password reset link sent to ${trimmedEmail}. Check your inbox.`);
      } catch (err: any) {
        setModalError(err?.message || 'Unable to send password reset email.');
      } finally {
        setLoadingProvider(null);
      }
      return;
    }

    if (!password || password.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }

    if (emailMode === 'signup' && !displayName.trim()) {
      setModalError('Please enter your name to create your account.');
      return;
    }

    try {
      setLoadingProvider('email');
      const user =
        emailMode === 'signup'
          ? await authService.registerWithEmail(trimmedEmail, password, displayName.trim())
          : await authService.signInWithEmail(trimmedEmail, password);

      setIsEmailModalOpen(false);
      onAuthenticated(user);
    } catch (err: any) {
      setModalError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <HeroBackground imageSrc="/assets/cellar-bg.jpg">
      {/* Top Brand Bar */}
      <header className="relative z-10 max-w-md w-full mx-auto flex items-center justify-start pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900/90 border border-stone-700/80 backdrop-blur-md flex items-center justify-center shadow-lg">
            <Wine className="w-5 h-5 text-rose-400" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-white block leading-none">
            CellarSync
          </span>
        </div>
      </header>

      {/* Lower-Half Anchored Editorial Headline & Sign-In Stack */}
      <main className="relative z-10 max-w-md w-full mx-auto mt-auto pt-36 sm:pt-44 pb-8 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight mb-4 text-balance drop-shadow-sm">
          Every Vintage, Accounted For.
        </h1>
        <ul className="flex flex-col gap-2.5 items-start mx-auto max-w-xs mb-7 text-left">
          {[
            'Precision Rack Mapping',
            'Instant Label Recognition',
            'Multi-Rack Inventory',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-600/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-amber-400" strokeWidth={2.5} />
              </span>
              <span className="text-sm sm:text-base font-normal text-zinc-100 leading-snug">
                {item}
              </span>
            </li>
          ))}
        </ul>

        {/* Inline Non-Blocking Auth Feedback Banner */}
        {authError && (
          <div
            role="alert"
            className="w-full max-w-xs mb-4 p-3 rounded-2xl bg-stone-900/95 border border-rose-500/50 backdrop-blur-md text-left flex items-start gap-2.5 shadow-xl animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-xs text-stone-200 leading-snug flex-1">{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="text-stone-400 hover:text-white p-0.5 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss sign-in notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Sign-In Button Stack: Google and Email */}
        <div className="w-full space-y-3 max-w-xs">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingProvider !== null}
            className="w-full h-12 px-4 bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs rounded-2xl shadow-xl transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-60 whitespace-nowrap"
          >
            {loadingProvider === 'google' ? (
              <span className="inline-block w-4 h-4 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Continue with Email */}
          <button
            type="button"
            onClick={() => handleOpenEmailModal('signin')}
            disabled={loadingProvider !== null}
            className="w-full h-12 px-4 bg-stone-900/90 hover:bg-stone-800/95 backdrop-blur-md border border-stone-700/80 text-white font-semibold text-xs rounded-2xl shadow-xl transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-60 whitespace-nowrap"
          >
            <Mail className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Continue with Email</span>
          </button>
        </div>
      </main>

      {/* Firebase Email & Password Authentication Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => !loadingProvider && setIsEmailModalOpen(false)}
          />

          {/* Modal Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-modal-title"
            className="relative w-full max-w-sm bg-stone-900 border border-stone-700/80 rounded-3xl p-6 text-stone-100 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(false)}
              disabled={loadingProvider !== null}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-full bg-stone-800/60 hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close email sign-in dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-11 h-11 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center mb-3 shadow-inner">
                <Mail className="w-5 h-5 text-rose-400" />
              </div>
              <h2 id="email-modal-title" className="text-lg font-serif font-bold text-white tracking-tight">
                {emailMode === 'signin'
                  ? 'Sign in with Email'
                  : emailMode === 'signup'
                  ? 'Create Cellar Account'
                  : 'Reset Password'}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {emailMode === 'signin'
                  ? 'Enter your email and password to access your cellar.'
                  : emailMode === 'signup'
                  ? 'Register with your email to start tracking your collection.'
                  : 'Enter your email and we will send you a password reset link.'}
              </p>
            </div>

            {/* Segmented Mode Switcher (Sign In / Create Account) */}
            {emailMode !== 'reset' && (
              <div className="grid grid-cols-2 gap-1 p-1 bg-stone-950 border border-stone-800 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('signin');
                    setModalError(null);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    emailMode === 'signin'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('signup');
                    setModalError(null);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    emailMode === 'signup'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error Banner */}
            {modalError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/60 text-xs text-rose-200 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Password Reset Confirmation Banner */}
            {resetSuccessMessage && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-xs text-emerald-200 flex items-start gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-left">
              {emailMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full h-10 px-3 text-xs bg-stone-950/90 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-rose-400/80 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full h-10 px-3 text-xs bg-stone-950/90 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-rose-400/80 transition-colors"
                />
              </div>

              {emailMode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-stone-300">
                      Password
                    </label>
                    {emailMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('reset');
                          setModalError(null);
                          setResetSuccessMessage(null);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={emailMode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                      autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full h-10 pl-3 pr-9 text-xs bg-stone-950/90 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-rose-400/80 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loadingProvider !== null}
                  className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-60"
                >
                  {loadingProvider === 'email' ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>
                      {emailMode === 'signin'
                        ? 'Sign In'
                        : emailMode === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Link'}
                    </span>
                  )}
                </button>

                {emailMode === 'reset' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('signin');
                      setModalError(null);
                      setResetSuccessMessage(null);
                    }}
                    disabled={loadingProvider !== null}
                    className="w-full h-8 text-stone-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={loadingProvider !== null}
                    className="w-full h-8 text-stone-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </HeroBackground>
  );
};
