/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import app from './firebase';

/**
 * Safely resolves the Firebase Storage instance, throwing an informative error
 * if Firebase or its storage bucket is not configured.
 */
function resolveStorageInstance(): FirebaseStorage {
  if (!app) {
    throw new Error(
      'Firebase app is not initialized. Please verify your Firebase configuration before uploading label images.'
    );
  }

  const bucket = app.options?.storageBucket;
  if (!bucket) {
    throw new Error(
      'Firebase Storage bucket is not configured in firebase-applet-config.json.'
    );
  }

  try {
    return getStorage(app);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize Firebase Storage: ${details}`);
  }
}

/**
 * Uploads a compressed WebP wine label blob to Firebase Storage under
 * `users/${userId}/labels/${bottleId}_${timestamp}.webp` and returns the HTTPS download URL.
 */
export async function uploadBottleLabelImage(
  userId: string,
  bottleId: string,
  imageBlob: Blob
): Promise<string> {
  if (!userId || !userId.trim()) {
    throw new Error('A valid userId is required to upload a bottle label image.');
  }
  if (!bottleId || !bottleId.trim()) {
    throw new Error('A valid bottleId is required to upload a bottle label image.');
  }

  const storage = resolveStorageInstance();
  const storagePath = `users/${userId.trim()}/labels/${bottleId.trim()}_${Date.now()}.webp`;
  const storageRef = ref(storage, storagePath);

  try {
    const snapshot = await uploadBytes(storageRef, imageBlob, {
      contentType: 'image/webp',
    });
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload bottle label image to Firebase Storage: ${details}`);
  }
}

/**
 * Checks whether a given URL points to Firebase Storage.
 */
function isFirebaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('gs://') ||
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('.firebasestorage.app') ||
    trimmed.includes('.appspot.com')
  );
}

/**
 * Deletes a bottle label image from Firebase Storage if the URL is a Firebase Storage reference.
 */
export async function deleteBottleLabelImage(imageUrl: string): Promise<void> {
  if (!isFirebaseStorageUrl(imageUrl)) {
    return;
  }

  let storage: FirebaseStorage;
  try {
    storage = resolveStorageInstance();
  } catch (error) {
    console.warn('Skipping label image deletion because Firebase Storage is unavailable:', error);
    return;
  }

  try {
    const fileRef = ref(storage, imageUrl);
    await deleteObject(fileRef);
  } catch (error: unknown) {
    // Ignore object-not-found if the image was already removed
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'storage/object-not-found'
    ) {
      return;
    }
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete bottle label image from Firebase Storage: ${details}`);
  }
}
