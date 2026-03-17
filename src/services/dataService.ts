import { 
  collection, 
  addDoc, 
  setDoc,
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc, 
  updateDoc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db, auth, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";
import { DocumentMetadata, UserProfile, ActivityLog, PROGRAMS } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, isSubscription: boolean = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  const logMessage = `Firestore Error (${operationType} on ${path}): ${JSON.stringify(errInfo)}`;
  console.error(logMessage);
  
  if (!isSubscription) {
    throw new Error(logMessage);
  }
}

// Mock Data for Local Fallback
const MOCK_DOCS: DocumentMetadata[] = [
  {
    id: "1",
    title: "CICS Student Handbook 2024",
    description: "Official guide for all CICS students regarding academic policies and campus life.",
    category: "Student Handbook",
    categories: PROGRAMS, // Available for all programs
    downloadURL: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "handbook.pdf",
    uploadedBy: "system",
    uploadedByName: "Admin",
    timestamp: Timestamp.now(),
    downloadCount: 42
  }
];

class DataService {
  private isFirebaseReady(): boolean {
    // Check if Firebase is initialized with real keys from config or env
    return (!!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TODO_KEYHERE") || 
           (!!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "");
  }

  // --- Documents ---
  async getDocuments(studentProgram?: string): Promise<DocumentMetadata[]> {
    try {
      if (this.isFirebaseReady()) {
        let q = query(collection(db, "documents"), orderBy("timestamp", "desc"));
        
        const snap = await getDocs(q);
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentMetadata));
        
        if (studentProgram) {
          docs = docs.filter(doc => doc.categories.includes(studentProgram));
        }
        
        return docs;
      }
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, "documents");
      }
      console.warn("Firebase failed, using local storage", e);
    }

    const local = localStorage.getItem("dochub_docs");
    const docs = local ? JSON.parse(local) : MOCK_DOCS;
    const filtered = studentProgram 
      ? docs.filter((d: any) => d.categories.includes(studentProgram)) 
      : docs;
    return filtered.map((d: any) => ({ 
      ...d, 
      timestamp: Timestamp.fromMillis(new Date(d.timestamp.seconds * 1000).getTime()) 
    }));
  }

  subscribeToDocuments(callback: (docs: DocumentMetadata[]) => void, studentProgram?: string) {
    if (this.isFirebaseReady()) {
      const q = query(collection(db, "documents"), orderBy("timestamp", "desc"));
      
      return onSnapshot(q, (snap: any) => {
        let docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DocumentMetadata));
        if (studentProgram) {
          docs = docs.filter((doc: any) => doc.categories.includes(studentProgram));
        }
        callback(docs);
      }, (error: any) => {
        handleFirestoreError(error, OperationType.LIST, "documents", true);
      });
    }
    
    // Fallback for local
    const interval = setInterval(async () => {
      const docs = await this.getDocuments(studentProgram);
      callback(docs);
    }, 2000);
    return () => clearInterval(interval);
  }

  subscribeToLogs(callback: (logs: ActivityLog[]) => void, startDate?: Date, endDate?: Date) {
    if (this.isFirebaseReady()) {
      let q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
      
      if (startDate) {
        q = query(q, where("timestamp", ">=", Timestamp.fromDate(startDate)));
      }
      
      return onSnapshot(q, (snap: any) => {
        const logs = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as ActivityLog))
          .filter((l: any) => {
            if (!l.timestamp) return true;
            if (!endDate) return true;
            const date = typeof l.timestamp.toDate === 'function' ? l.timestamp.toDate() : new Date((l.timestamp.seconds || 0) * 1000);
            return date <= endDate;
          });
        callback(logs);
      }, (error: any) => {
        handleFirestoreError(error, OperationType.LIST, "logs", true);
      });
    }

    // Fallback for local
    const interval = setInterval(async () => {
      const logs = await this.getLogs(startDate, endDate);
      callback(logs);
    }, 2000);
    return () => clearInterval(interval);
  }

  async deleteDocument(docId: string, docTitle: string = "Unknown Document") {
    if (this.isFirebaseReady()) {
      try {
        // Get the document first to check for driveFileId
        const docRef = doc(db, "documents", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentMetadata;
          if (data.driveFileId) {
            try {
              await fetch(`/api/upload/drive/${data.driveFileId}`, {
                method: 'DELETE'
              });
            } catch (driveErr) {
              console.error("Failed to delete from Google Drive:", driveErr);
              // We continue even if Drive delete fails to ensure Firestore is cleaned up
            }
          }
        }

        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(docRef);
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.DELETE, `documents/${docId}`);
        }
        console.error("Firebase delete failed:", e);
      }
    }

    const local = localStorage.getItem("dochub_docs");
    if (local) {
      const docs = JSON.parse(local);
      localStorage.setItem("dochub_docs", JSON.stringify(docs.filter((d: any) => d.id !== docId)));
    }

    this.logActivity({
      userId: auth.currentUser?.uid || "local-admin",
      userEmail: auth.currentUser?.email || "admin@neu.edu.ph",
      action: "delete",
      documentId: docId,
      documentTitle: docTitle,
      timestamp: Timestamp.now()
    });
  }

  async updateDocument(docId: string, updates: Partial<DocumentMetadata>) {
    if (this.isFirebaseReady()) {
      try {
        const docRef = doc(db, "documents", docId);
        const docSnap = await getDoc(docRef);
        const oldData = docSnap.exists() ? docSnap.data() as DocumentMetadata : null;
        
        // Filter out unchanged fields to keep logs clean
        const actualUpdates: any = {};
        if (oldData) {
          Object.keys(updates).forEach(key => {
            const newVal = (updates as any)[key];
            const oldVal = (oldData as any)[key];
            
            if (Array.isArray(newVal)) {
              if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
                actualUpdates[key] = newVal;
              }
            } else if (newVal !== oldVal) {
              actualUpdates[key] = newVal;
            }
          });
        } else {
          Object.assign(actualUpdates, updates);
        }

        if (Object.keys(actualUpdates).length === 0) return;

        await updateDoc(docRef, actualUpdates);
        
        // Log activity
        const changedFields = Object.keys(actualUpdates);
        let detailMsg = `Updated: ${changedFields.join(", ")}`;
        
        if (oldData) {
          const changes = changedFields.map(field => {
            const newVal = actualUpdates[field];
            const oldVal = (oldData as any)[field];
            if (Array.isArray(newVal)) {
              return `${field} (${oldVal?.length || 0} -> ${newVal.length} items)`;
            }
            return `${field} ("${oldVal}" -> "${newVal}")`;
          });
          detailMsg = `Changes: ${changes.join("; ")}`;
        }

        await this.logActivity({
          userId: auth.currentUser?.uid || "local-admin",
          userEmail: auth.currentUser?.email || "admin@neu.edu.ph",
          action: "update",
          documentId: docId,
          documentTitle: actualUpdates.title || oldData?.title || "Updated Document",
          details: detailMsg,
          timestamp: Timestamp.now()
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.UPDATE, `documents/${docId}`);
        }
        console.error("Firebase update document failed:", e);
        throw e;
      }
    }

    const local = localStorage.getItem("dochub_docs");
    if (local) {
      const docs = JSON.parse(local);
      localStorage.setItem("dochub_docs", JSON.stringify(
        docs.map((d: any) => d.id === docId ? { ...d, ...updates } : d)
      ));
    }
  }

  async uploadFile(file: File): Promise<string> {
    if (this.isFirebaseReady()) {
      try {
        const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
      } catch (e: any) {
        console.error("Firebase storage upload failed:", e);
        throw e;
      }
    }
    // For local fallback, we'll just return a mock URL
    return URL.createObjectURL(file);
  }

  async uploadDocument(docData: Omit<DocumentMetadata, "id" | "timestamp" | "downloadCount">) {
    let docId = "";
    let docTitle = docData.title;

    if (this.isFirebaseReady()) {
      try {
        // Optimization: Pre-generate ID to avoid server round-trip for ID generation
        const docRef = doc(collection(db, "documents"));
        docId = docRef.id;

        await setDoc(docRef, {
          ...docData,
          timestamp: serverTimestamp(),
          downloadCount: 0
        });

        // Log activity (await to ensure persistence)
        await this.logActivity({
          userId: auth.currentUser?.uid || "local-admin",
          userEmail: auth.currentUser?.email || "admin@neu.edu.ph",
          action: "upload",
          documentId: docId,
          documentTitle: docTitle,
          timestamp: Timestamp.now()
        });
        
        return docId;
      } catch (e: any) {
        console.error("Firebase upload failed:", e);
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.CREATE, "documents");
        }
        throw e;
      }
    }

    // Fallback for local only if Firebase is not ready
    const local = localStorage.getItem("dochub_docs");
    const docs = local ? JSON.parse(local) : MOCK_DOCS;
    docId = Math.random().toString(36).substr(2, 9);
    const newDoc = {
      ...docData,
      id: docId,
      timestamp: { seconds: Math.floor(Date.now() / 1000) },
      downloadCount: 0
    };
    localStorage.setItem("dochub_docs", JSON.stringify([newDoc, ...docs]));

    // Log activity in local case
    await this.logActivity({
      userId: "local-admin",
      userEmail: "admin@neu.edu.ph",
      action: "upload",
      documentId: docId,
      documentTitle: docTitle,
      timestamp: Timestamp.now()
    });
    
    return docId;
  }

  // --- Analytics & Logs ---
  async logView(uid: string, docId: string, docTitle?: string, userRole?: 'admin' | 'student') {
    // We track views in the activity log
    this.logActivity({
      userId: uid,
      userEmail: auth.currentUser?.email || "student@neu.edu.ph",
      action: "view",
      userRole,
      documentId: docId,
      documentTitle: docTitle,
      timestamp: Timestamp.now()
    });
  }

  async logActivity(log: Omit<ActivityLog, "id">) {
    if (this.isFirebaseReady()) {
      try {
        await addDoc(collection(db, "logs"), { ...log, timestamp: serverTimestamp() });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.CREATE, "logs");
        }
        console.error("Firebase log activity failed:", e);
      }
    }

    const local = localStorage.getItem("dochub_logs");
    const logs = local ? JSON.parse(local) : [];
    const newLog = { ...log, id: Date.now().toString(), timestamp: { seconds: Math.floor(Date.now() / 1000) } };
    localStorage.setItem("dochub_logs", JSON.stringify([newLog, ...logs]));
  }

  async getLogs(startDate: Date, endDate: Date): Promise<ActivityLog[]> {
    if (this.isFirebaseReady()) {
      try {
        const q = query(
          collection(db, "logs"),
          where("timestamp", ">=", Timestamp.fromDate(startDate)),
          where("timestamp", "<=", Timestamp.fromDate(endDate)),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.LIST, "logs");
        }
        console.error("Firebase logs fetch failed:", e);
      }
    }

    const local = localStorage.getItem("dochub_logs");
    const logs = local ? JSON.parse(local) : [];
    return logs
      .map((l: any) => ({ 
        ...l, 
        timestamp: Timestamp.fromMillis(new Date(l.timestamp.seconds * 1000).getTime()) 
      }))
      .filter((l: any) => {
        const date = l.timestamp.toDate();
        return date >= startDate && date <= endDate;
      });
  }

  async toggleUserBlock(user: UserProfile) {
    const newStatus = !user.isBlocked;
    if (this.isFirebaseReady()) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { isBlocked: newStatus });
        
        // Log activity
        await this.logActivity({
          userId: auth.currentUser?.uid || "local-admin",
          userEmail: auth.currentUser?.email || "admin@neu.edu.ph",
          action: newStatus ? "block" : "unblock",
          targetUserId: user.uid,
          targetUserEmail: user.email,
          timestamp: Timestamp.now()
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
        }
        console.error("Firebase toggle block failed:", e);
      }
    }

    const local = localStorage.getItem("dochub_users");
    if (local) {
      const users = JSON.parse(local);
      localStorage.setItem("dochub_users", JSON.stringify(
        users.map((u: any) => u.uid === user.uid ? { ...u, isBlocked: newStatus } : u)
      ));
    }
  }

  async updateUserRole(user: UserProfile, newRole: 'admin' | 'student') {
    if (this.isFirebaseReady()) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { role: newRole });
        
        // Log activity
        await this.logActivity({
          userId: auth.currentUser?.uid || "local-admin",
          userEmail: auth.currentUser?.email || "admin@neu.edu.ph",
          action: "role_update",
          targetUserId: user.uid,
          targetUserEmail: user.email,
          details: `Changed role to ${newRole}`,
          timestamp: Timestamp.now()
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
        }
        console.error("Firebase update role failed:", e);
        throw e;
      }
    }

    const local = localStorage.getItem("dochub_users");
    if (local) {
      const users = JSON.parse(local);
      localStorage.setItem("dochub_users", JSON.stringify(
        users.map((u: any) => u.uid === user.uid ? { ...u, role: newRole } : u)
      ));
    }
  }

  // --- Users ---
  async getUsers(): Promise<UserProfile[]> {
    if (this.isFirebaseReady()) {
      try {
        const q = query(collection(db, "users"));
        const snap = await getDocs(q);
        const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        users.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        return users;
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.LIST, "users");
        }
        console.error("Firebase users fetch failed:", e);
      }
    }

    const local = localStorage.getItem("dochub_users");
    return local ? JSON.parse(local) : [];
  }

  subscribeToUsers(callback: (users: UserProfile[]) => void) {
    if (this.isFirebaseReady()) {
      // Removing orderBy to ensure users without createdAt are still returned
      const q = query(collection(db, "users"));
      
      return onSnapshot(q, (snap: any) => {
        const users = snap.docs.map((d: any) => ({ uid: d.id, ...d.data() } as UserProfile));
        // Sort client-side instead
        users.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        callback(users);
      }, (error: any) => {
        handleFirestoreError(error, OperationType.LIST, "users", true);
      });
    }

    // Fallback for local
    const interval = setInterval(async () => {
      const users = await this.getUsers();
      callback(users);
    }, 2000);
    return () => clearInterval(interval);
  }

  async updateUserActiveStatus(uid: string) {
    if (this.isFirebaseReady()) {
      try {
        const userRef = doc(db, "users", uid);
        // Use setDoc with merge to ensure it works even if doc doesn't exist
        // and avoid unnecessary getDoc. lastSeen is never reset to 0.
        await setDoc(userRef, { 
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
        }
        console.error("Firebase update active status failed:", e);
      }
    }
  }
}

export const dataService = new DataService();
