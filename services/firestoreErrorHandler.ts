import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

/**
 * Robust error handler for Firestore operations.
 * Gracefully handles connectivity issues by returning rather than throwing.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCombined = (errorMessage + " " + String(error)).toLowerCase();
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };

  const isOffline = errorCombined.includes('offline') || 
                    errorCombined.includes('unavailable') ||
                    errorCombined.includes('could not reach') ||
                    errorCombined.includes('network') ||
                    errorCombined.includes('internet') ||
                    errorCombined.includes('deadline-exceeded') ||
                    errorCombined.includes('timeout') ||
                    errorCombined.includes('handshake') ||
                    errorCombined.includes('failed-precondition') ||
                    errorCombined.includes('unreachable');

  if (isOffline) {
    // Only log as a warning to avoid cluttering the error log for expected offline scenarios
    console.warn(`[Firestore Offline] Operation ${operationType} on ${path} bypassed due to connectivity: ${errorMessage}`);
    return true; // Indicates it was an offline error
  }

  // Log as error but do NOT throw to prevent React tree crashes
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return false;
}
