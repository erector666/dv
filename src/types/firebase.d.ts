declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    getIdToken(): Promise<string>;
  }

  export interface UserCredential {
    user: User;
  }

  export function getAuth(app?: any): any;
  export function createUserWithEmailAndPassword(
    auth: any,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function signInWithEmailAndPassword(
    auth: any,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function signOut(auth: any): Promise<void>;
  export function onAuthStateChanged(
    auth: any,
    callback: (user: User | null) => void
  ): () => void;
  export function sendPasswordResetEmail(
    auth: any,
    email: string
  ): Promise<void>;
  export function updateProfile(
    user: User,
    profile: { displayName?: string; photoURL?: string | null }
  ): Promise<void>;
  export function sendEmailVerification(user: User): Promise<void>;
}

declare module 'firebase/storage' {
  export interface UploadTaskSnapshot {
    bytesTransferred: number;
    totalBytes: number;
    state: string;
    metadata: any;
    task: any;
    ref: any;
  }

  export interface StorageError {
    code: string;
    message: string;
    name: string;
  }

  export interface UploadTask {
    on(
      event: string,
      nextOrObserver?: ((snapshot: UploadTaskSnapshot) => void) | null,
      error?: ((error: StorageError) => void) | null,
      complete?: (() => void) | null
    ): () => void;
    snapshot: UploadTaskSnapshot;
  }

  export function ref(storage: any, path?: string): any;
  export function uploadBytesResumable(
    ref: any,
    data: Blob | Uint8Array | ArrayBuffer
  ): UploadTask;
  export function uploadBytes(
    ref: any,
    data: Blob | Uint8Array | ArrayBuffer
  ): Promise<UploadTaskSnapshot>;
  export function getDownloadURL(ref: any): Promise<string>;
  export function deleteObject(ref: any): Promise<void>;
  export function getStorage(app?: any): any;
  export function listAll(ref: any): Promise<{ items: any[] }>;
  export function getMetadata(
    ref: any
  ): Promise<{ size: number; name: string; fullPath: string }>;
}

declare module 'firebase/firestore' {
  export interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
    toDate(): Date;
    toMillis(): number;
  }

  export interface QueryDocumentSnapshot {
    id: string;
    data(): any;
    exists(): boolean;
    get(fieldPath: string): any;
  }

  export interface QuerySnapshot {
    forEach(callback: (doc: QueryDocumentSnapshot) => void): void;
    docs: QueryDocumentSnapshot[];
    size: number;
    empty: boolean;
  }

  export function getFirestore(app?: any): any;
  export function collection(firestore: any, path: string): any;
  export function doc(firestore: any, path: string): any;
  export function addDoc(reference: any, data: any): Promise<any>;
  export function updateDoc(reference: any, data: any): Promise<void>;
  export function deleteDoc(reference: any): Promise<void>;
  export function getDoc(reference: any): Promise<any>;
  export function getDocs(query: any): Promise<QuerySnapshot>;
  export function query(reference: any, ...constraints: any[]): any;
  export function where(fieldPath: string, opStr: any, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: string): any;
  export function limit(limit: number): any;
  export function onSnapshot(
    query: any,
    callback: (snapshot: any) => void
  ): () => void;
  export function serverTimestamp(): any;
  export const Timestamp: {
    now(): FirestoreTimestamp;
    fromDate(date: Date): FirestoreTimestamp;
    fromMillis(milliseconds: number): FirestoreTimestamp;
  };
}

declare module 'firebase/functions' {
  export interface HttpsCallableResult<T = any> {
    data: T;
  }

  export interface HttpsCallable<T = any, R = any> {
    (data?: T): Promise<HttpsCallableResult<R>>;
  }

  export function httpsCallable<T = any, R = any>(
    functions: any,
    name: string
  ): HttpsCallable<T, R>;
  export function getFunctions(app?: any): any;
}

declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: any;
  }

  export function initializeApp(config: any): FirebaseApp;
}

declare module 'class-variance-authority' {
  export function cva(base: string, config: any): any;
  export type VariantProps<T> = any;
}
