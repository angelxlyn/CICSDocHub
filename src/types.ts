export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  program?: string;
  bio?: string;
  isBlocked: boolean;
  createdAt: any;
  lastSeen?: any;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  category?: string;
  categories: string[];
  downloadURL: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy: string;
  uploadedByName?: string;
  driveFileId?: string;
  createdAt?: any;
  timestamp: any;
  downloadCount: number;
}

export interface DownloadLog {
  id: string;
  uid: string;
  docId: string;
  date: any;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: 'upload' | 'login' | 'download' | 'view' | 'block' | 'unblock' | 'delete' | 'role_update' | 'update';
  userRole?: UserRole;
  documentId?: string;
  documentTitle?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: string;
  timestamp: any;
}

export const PROGRAMS = [
  'BS in Computer Science',
  'BS in Information Technology',
  'BS in Information System',
  'Bachelor of Library and Information Science',
  'BS in Entertainment and Multimedia Computing with Specialization in Game Development',
  'BS in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology'
];

export const PROGRAM_ABBREVIATIONS: Record<string, string> = {
  'BS in Computer Science': 'BSCS',
  'BS in Information Technology': 'BSIT',
  'BS in Information System': 'BSIS',
  'Bachelor of Library and Information Science': 'BLIS',
  'BS in Entertainment and Multimedia Computing with Specialization in Game Development': 'BSEMC-GD',
  'BS in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology': 'BSEMC-DAT'
};

export const DOCUMENT_CATEGORIES = [
  'Institutional Forms',
  'Department Policies',
  'Academic Guides',
  'Student Handbooks',
  'Curriculum & Syllabi',
  'Manuals & Procedures',
  'Research & Publications',
  'Announcements & Notices',
  'Others'
];
