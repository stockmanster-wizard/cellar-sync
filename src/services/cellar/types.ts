/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  GET = 'GET',
  SYNC = 'SYNC',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  timestamp: string;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
  console.error(`Firestore error during [${operationType}] at path [${path}]:`, error);
  return {
    error: errMessage,
    operationType,
    path,
    timestamp: new Date().toISOString(),
  };
}
