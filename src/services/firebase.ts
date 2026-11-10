/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with Native Multi-Tab Persistence and specific database ID if configured
const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

function initPersistentFirestore(): Firestore {
  try {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const settings = {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      };
      return databaseId
        ? initializeFirestore(app, settings, databaseId)
        : initializeFirestore(app, settings);
    }
  } catch (err) {
    console.warn('Firestore persistent local cache fallback to existing instance:', err);
  }
  return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = initPersistentFirestore();

// Test Firestore connection on boot as mandated by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export default app;
