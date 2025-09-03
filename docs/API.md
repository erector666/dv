# API Documentation

## Firebase Services

### Authentication

```typescript
// Sign in with email and password
signInWithEmailAndPassword(auth, email, password);

// Sign up with email and password
createUserWithEmailAndPassword(auth, email, password);

// Sign out
signOut(auth);

// Get current user
const user = auth.currentUser;
```

### Firestore

```typescript
// Get documents from a collection
const querySnapshot = await getDocs(collection(db, 'documents'));

// Add a document to a collection
await addDoc(collection(db, 'documents'), {
  title: 'Document Title',
  category: 'Category',
  uploadDate: serverTimestamp(),
  userId: auth.currentUser?.uid,
});

// Update a document
await updateDoc(doc(db, 'documents', documentId), {
  title: 'Updated Title',
});

// Delete a document
await deleteDoc(doc(db, 'documents', documentId));
```

### Storage

```typescript
// Upload a file
const storageRef = ref(
  storage,
  `documents/${auth.currentUser?.uid}/${file.name}`
);
await uploadBytes(storageRef, file);

// Get download URL
const url = await getDownloadURL(storageRef);

// Delete a file
await deleteObject(storageRef);
```

## Document Processing API

### Document Classification

```typescript
// Classify a document
const classification = await classifyDocument(file);

// Get document metadata
const metadata = await extractMetadata(file);
```

### Document Translation

```typescript
// Translate a document
const translatedContent = await translateDocument(documentId, targetLanguage);
```

## User Preferences API

```typescript
// Get user preferences
const preferences = await getUserPreferences(userId);

// Update user preferences
await updateUserPreferences(userId, {
  theme: 'dark',
  language: 'en',
});
```
