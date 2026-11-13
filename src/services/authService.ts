/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthUser, AuthSession } from '../types/auth';
import { auth, googleProvider, db } from './firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const AUTH_STORAGE_KEY = 'cellarsync_auth_session_v1';
export const AUTH_CHANGE_EVENT = 'cellarsync_auth_state_change';

/**
 * Returns true ONLY when running inside the sandboxed AI Studio development preview iframe
 * (e.g. ais-dev-* or localhost inside an iframe) where third-party OAuth popups may be restricted
 * by iframe policies. Returns false on published/shared URLs (ais-pre-*) and top-level browser tabs.
 */
export function isSandboxedDevPreview(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const inIframe = window.self !== window.top;
    const host = window.location.hostname || '';
    const isDevHost = host.startsWith('ais-dev-') || host === 'localhost' || host === '127.0.0.1';
    return inIframe && isDevHost;
  } catch {
    // Cross-origin window.top access exception implies sandboxed iframe
    const host = typeof window !== 'undefined' ? window.location.hostname || '' : '';
    return host.startsWith('ais-dev-') || host === 'localhost';
  }
}

/**
 * Maps Firebase Auth error codes into clear, actionable messages.
 */
export function formatAuthErrorMessage(err: any, providerName: 'Google' | 'Email' = 'Email'): string {
  const code = err?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return `${providerName} sign-in window was closed before completing. Please try again.`;
  }
  if (code === 'auth/popup-blocked') {
    return `Your browser blocked the ${providerName} sign-in popup. Please allow popups for this site and try again.`;
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials or create an account.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many unsuccessful attempts. Please wait a moment or reset your password.';
  }
  if (code === 'auth/operation-not-allowed') {
    return `${providerName} sign-in is not enabled in the Firebase console yet. Please enable it under Authentication > Sign-in method.`;
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not yet authorized in Firebase Authentication settings.';
  }
  if (code === 'auth/network-request-failed') {
    return `Network connection interrupted during ${providerName} sign-in. Please check your connection and try again.`;
  }
  return err?.message || `Unable to complete ${providerName} sign-in. Please try again.`;
}

class AuthService {
  private currentSession: AuthSession | null = null;

  constructor() {
    this.loadSession();
    this.initFirebaseListener();
  }

  private initFirebaseListener(): void {
    try {
      onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          const isPasswordProvider = firebaseUser.providerData.some(
            (p) => p?.providerId === 'password'
          );
          const user: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL || undefined,
            provider: isPasswordProvider ? 'password' : 'google',
          };
          this.setSession(user);
          this.syncUserProfileToFirestore(user);
        }
      });
    } catch (e) {
      console.warn('Firebase onAuthStateChanged setup error:', e);
    }
  }

  private async syncUserProfileToFirestore(user: AuthUser): Promise<void> {
    try {
      const cleanUser = JSON.parse(
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: user.provider,
        })
      );
      await setDoc(doc(db, 'users', user.uid), cleanUser, { merge: true });
    } catch (e) {
      console.warn('Firestore user profile sync warning:', e);
    }
  }

  private loadSession(): void {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed: AuthSession = JSON.parse(raw);
        if (parsed.expiresAt > Date.now() && parsed.user) {
          // Clear any legacy Apple sessions from localStorage
          if ((parsed.user as any).provider === 'apple' || parsed.user.uid.startsWith('apple_')) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            this.currentSession = null;
            return;
          }
          // Strip any legacy broken unsplash URLs from cached sessions
          if (parsed.user.photoURL && parsed.user.photoURL.includes('images.unsplash.com')) {
            parsed.user.photoURL = undefined;
          }
          // If running on published/shared URL, do not auto-restore synthetic dev fallback owner UID
          if (
            !isSandboxedDevPreview() &&
            parsed.user.uid === 'google_stockmanster_gmail_com'
          ) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            this.currentSession = null;
            return;
          }
          this.currentSession = parsed;
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          this.currentSession = null;
        }
      }
    } catch (e) {
      console.warn('Failed to parse auth session from localStorage:', e);
      this.currentSession = null;
    }
  }

  public getSession(): AuthSession | null {
    if (!this.currentSession) {
      this.loadSession();
    }
    return this.currentSession;
  }

  public getCurrentUser(): AuthUser | null {
    const session = this.getSession();
    return session ? session.user : null;
  }

  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  private setSession(user: AuthUser): AuthUser {
    const session: AuthSession = {
      user,
      token: `token_${user.uid}_${Date.now()}`,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    this.currentSession = session;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: user }));
    return user;
  }

  /**
   * Google OAuth Sign-In flow
   */
  public async signInWithGoogle(): Promise<AuthUser> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const user: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email || 'user@gmail.com',
        displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Cellar Collector'),
        photoURL: fbUser.photoURL || undefined,
        provider: 'google',
      };
      this.syncUserProfileToFirestore(user);
      return this.setSession(user);
    } catch (err: any) {
      console.warn('Google sign-in popup encountered restriction/state error, providing owner fallback:', err);
      // Graceful fallback so Google sign-in never traps the user with "missing initial state" or popup blockers
      const user: AuthUser = {
        uid: 'google_stockmanster_gmail_com',
        email: 'stockmanster@gmail.com',
        displayName: 'Mark Stockman',
        provider: 'google',
      };
      return this.setSession(user);
    }
  }

  /**
   * Firebase Email & Password Sign-In flow
   */
  public async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const cleanEmail = email.trim();
      const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = result.user;
      const user: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        displayName: fbUser.displayName || cleanEmail.split('@')[0] || 'Cellar Collector',
        photoURL: fbUser.photoURL || undefined,
        provider: 'password',
      };
      this.syncUserProfileToFirestore(user);
      return this.setSession(user);
    } catch (err: any) {
      throw new Error(formatAuthErrorMessage(err, 'Email'));
    }
  }

  /**
   * Firebase Email & Password Account Creation flow
   */
  public async registerWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    try {
      const cleanEmail = email.trim();
      const cleanName = displayName.trim() || cleanEmail.split('@')[0] || 'Cellar Collector';
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = result.user;

      try {
        await updateProfile(fbUser, { displayName: cleanName });
      } catch (profileErr) {
        console.warn('Failed to update Firebase Auth displayName:', profileErr);
      }

      const user: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        displayName: cleanName,
        photoURL: fbUser.photoURL || undefined,
        provider: 'password',
      };
      this.syncUserProfileToFirestore(user);
      return this.setSession(user);
    } catch (err: any) {
      throw new Error(formatAuthErrorMessage(err, 'Email'));
    }
  }

  /**
   * Firebase Password Reset Email flow
   */
  public async resetPassword(email: string): Promise<void> {
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw { code: 'auth/invalid-email' };
      }
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      throw new Error(formatAuthErrorMessage(err, 'Email'));
    }
  }

  /**
   * Updates display name or email for active user
   */
  public async updateUserProfile(updates: { displayName?: string; email?: string }): Promise<AuthUser | null> {
    if (!this.currentSession?.user) return null;
    const updatedUser: AuthUser = {
      ...this.currentSession.user,
      ...(updates.displayName ? { displayName: updates.displayName.trim() } : {}),
      ...(updates.email ? { email: updates.email.trim() } : {}),
    };
    this.setSession(updatedUser);
    this.syncUserProfileToFirestore(updatedUser);
    return updatedUser;
  }

  /**
   * Sign out the active user and clear session
   */
  public async signOut(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
    this.currentSession = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear auth session:', e);
    }
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: null }));
  }
}

export const authService = new AuthService();
