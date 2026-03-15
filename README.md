# CICS DocHub

A secure document management system for the College of Information and Computing Studies (CICS) at New Era University (NEU).

**🌐 Live Demo:** [https://ais-pre-hypyaxkywdrgirgqlha7s6-337559004932.asia-southeast1.run.app](https://ais-pre-hypyaxkywdrgirgqlha7s6-337559004932.asia-southeast1.run.app)

## 🚀 Overview

CICS DocHub is designed to streamline the management and distribution of academic and institutional documents. It provides a centralized portal where students and administrators can securely access, upload, and track documents relevant to the college.

## ✨ Features

- **Secure Authentication:** Exclusive access for `@neu.edu.ph` accounts via Google Authentication.
- **Role-Based Access Control (RBAC):**
  - **Students:** Can view, search, and download documents relevant to their academic programs.
  - **Admins:** Full control over document management, user blocking/unblocking, and system analytics.
- **Document Management:** Support for PDF uploads with categorization (Institutional Forms, Academic Guides, Handbooks, etc.).
- **User Profiles:** Students can select their academic program and maintain a personal bio.
- **Analytics Dashboard:** Real-time tracking of downloads, uploads, and user activity.
- **Dark Mode Support:** Fully responsive UI with a sleek dark mode theme.
- **Real-time Updates:** Powered by Firebase Firestore for instantaneous data synchronization.

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Animations:** Motion (Framer Motion)
- **Icons:** Lucide React
- **Backend/Database:** Firebase (Authentication & Firestore)
- **Date Handling:** date-fns

## 🛡️ Security Rules

The project includes a `firestore.rules` file that enforces:
- Only authenticated `@neu.edu.ph` users can access the database.
- Students have read-only access to documents.
- Only Admins can perform write operations on documents and manage user statuses.
- Users can only edit their own profile information.

## 📄 License

This project is developed for the College of Information and Computing Studies. All rights reserved.
