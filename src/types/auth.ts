/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'google' | 'password';
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}
