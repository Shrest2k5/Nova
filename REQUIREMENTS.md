# Requirements & Acceptance Criteria

Comprehensive specification for the Novastat Full-Stack File Upload and Processing Management System.

---

## 1. Functional Requirements

### 1.1 Authentication & User Management
- **FR-AUTH-01:** System must allow new users to register with name, unique email, password, and optional role (`USER` or `ADMIN`).
- **FR-AUTH-02:** System must hash passwords using `bcryptjs` with standard salt rounds before storage. Plain-text passwords or hashes must never be exposed.
- **FR-AUTH-03:** System must authenticate credentials and issue JSON Web Tokens (JWT) with standard expiry (`7d`).
- **FR-AUTH-04:** System must protect private backend routes using authentication middleware and reject unauthorized requests with HTTP 401.
- **FR-AUTH-05:** System must protect private frontend views (`ProtectedRoute`), automatically redirecting unauthenticated sessions to `/login`.
- **FR-AUTH-06:** System must provide `GET /api/v1/auth/me` to retrieve the active user profile.
- **FR-AUTH-07:** System must support role-based access control (`USER` vs `ADMIN`).

### 1.2 Dashboard
- **FR-DASH-01:** System must compute and display actual PostgreSQL database counts: Total Files, Completed Files, Processing Files, and Failed Files.
- **FR-DASH-02:** Dashboard must display a recent upload activity feed with status badges and live progress indicators.
- **FR-DASH-03:** Admin users must be able to view overall system-wide file volume and registered account metrics.

### 1.3 File Upload & Validation
- **FR-FILE-01:** System must support both native file picker selection and drag-and-drop file inputs.
- **FR-FILE-02:** System must display filename, human-readable size, and MIME content type before and during upload.
- **FR-FILE-03:** Backend must validate both file extension and MIME type against an approved whitelist (PDF, DOCX, XLSX, Images, ZIP, TXT, JSON, CSV).
- **FR-FILE-04:** Backend must reject files exceeding the maximum size limit (50MB) with an informative message.
- **FR-FILE-05:** Frontend must stream upload progress to the UI using Axios upload progress events.
- **FR-FILE-06:** Storage layer must persist uploaded files to disk with collision-proof unique stored filenames to prevent path traversal and file overwrite attacks.
- **FR-FILE-07:** Upload endpoint must save file record with status `PENDING` and return promptly without blocking.

### 1.4 Document Intelligence & Background Processing Pipeline
- **FR-PROC-01:** Upload completion automatically initiates an asynchronous background processing pipeline (~16–20 seconds).
- **FR-PROC-02:** Background processing must not block the Node.js event loop or delay HTTP responses.
- **FR-PROC-03 (Stage 1 - PDF Validation):** Validate PDF header signature (`%PDF-`), verify 50MB size limit, inspect encryption/passwords, and retrieve document page count (0–25% progress).
- **FR-PROC-04 (Stage 2 - Text Extraction):** Read stored PDF, extract selectable text across all pages preserving boundaries using `pdf-parse`, detect scanned/image-only PDFs and report an OCR-required error, and persist extracted text to PostgreSQL (25–50% progress).
- **FR-PROC-05 (Stage 3 - Gemini AI Content Analysis):** Divide large text into manageable chunks without token overflow, analyze core topics, key concepts, findings, and terminology using `@google/genai` (50–75% progress). If `GEMINI_API_KEY` is unconfigured, return a clear configuration error.
- **FR-PROC-06 (Stage 4 - Structured Summary Generation):** Generate structured JSON summary conforming to the schema (title, overview, keyPoints, importantTerms, importantFacts, conclusion), validate JSON, and commit to PostgreSQL (75–100% progress).
- **FR-PROC-07:** On successful completion, status must update to `COMPLETED`, stage to `COMPLETED`, progress to 100, and set `completedAt`.
- **FR-PROC-08:** On corruption or failure, status must update to `FAILED` and record an explanatory error message.
- **FR-PROC-09:** Duplicate processing of the same file must be avoided.
- **FR-PROC-10:** Document reprocessing via `POST /api/v1/files/:id/reprocess` allows users to re-run extraction and AI analysis without re-uploading.

### 1.5 Document Details & AI Intelligence View
- **FR-VIEW-01:** File Details page must display three tabs: TAB 1 (AI Summary), TAB 2 (Extracted Text), TAB 3 (Document Information).
- **FR-VIEW-02:** AI Summary tab must render title, overview, key points bullet list, terminology definition cards, key facts callouts, and conclusion.
- **FR-VIEW-03:** Extracted Text tab must render complete document content with copy-to-clipboard functionality.
- **FR-VIEW-04:** Reprocess button must be available for retrying failed or completed documents.

### 1.5 Real-Time Status Polling
- **FR-POLL-01:** Frontend must continuously poll `GET /api/v1/files/:id/status` every 1–2 seconds while processing.
- **FR-POLL-02:** Polling must automatically stop once the file transitions to `COMPLETED` or `FAILED`.
- **FR-POLL-03:** Polling timers must be unmounted and cleaned up when components unmount to prevent memory leaks.
- **FR-POLL-04:** Processing status must survive browser refreshes by reading directly from PostgreSQL.
- **FR-POLL-05:** UI must display dynamic animated progress bars and state badges.

### 1.6 File Management & Security
- **FR-MGT-01:** Users must be able to list, search by filename, and filter files by status (`ALL`, `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).
- **FR-MGT-02:** Users can view full metadata for their own files.
- **FR-MGT-03:** Users can download completed files.
- **FR-MGT-04:** Users can permanently delete their own files (unlinking storage and database records).
- **FR-MGT-05:** System must enforce strict user isolation: regular users cannot view, download, or delete other users' files.

---

## 2. Non-Functional Requirements

- **NFR-PERF-01 (Prompt Upload Response):** The upload HTTP endpoint must respond within <300ms upon saving the file and record, initiating the 25s processing task strictly in the background.
- **NFR-SEC-01 (Input Validation):** All incoming HTTP request parameters, bodies, and query strings must be validated with Zod schemas.
- **NFR-SEC-02 (Storage Security):** Files must be stored with sanitized random names. Stored paths must be sanitized using `path.basename` to prevent path traversal.
- **NFR-SEC-03 (Authentication Security):** Authentication endpoints (`/register`, `/login`) must be rate-limited (20 requests per 15 minutes) to protect against brute-force attacks.
- **NFR-LOG-01 (Structured Logging):** Winston must be used to record structured JSON logs to `logs/combined.log` and `logs/error.log`, without exposing plaintext passwords, tokens, or stack traces in production.
- **NFR-MOD-01 (Clean Architecture):** Strict modularity must be maintained: Controllers, Services, Repositories, Storage Providers, and Workers must not be coupled or mingled into single files.

---

## 3. Technology Stack Requirements

| Component | Selected Technology | Constraints & Validation |
|---|---|---|
| **Frontend Framework** | React.js (v19) with Vite (v8) | Modular JSX, responsive Tailwind CSS |
| **Routing** | React Router DOM (v7) | Public and Protected route hierarchies |
| **Icons** | Lucide React | Consistent UI icon set |
| **HTTP Client** | Axios | Interceptors, upload progress |
| **Backend Runtime** | Node.js (ES Modules) | Strict separation of concerns |
| **Web Framework** | Express.js | Layered REST API |
| **Database ORM** | Prisma ORM | SQL migrations, type-safe queries |
| **Database Engine** | PostgreSQL 16 | Relational data, indexes, constraints |
| **Authentication** | JWT & bcryptjs | Stateless authorization |
| **File Handling** | Multer | Disk storage with size and type checks |
| **Validation** | Zod | Request body and query validation |
| **Logging** | Winston | Multi-transport structured logs |
| **Containerization** | Docker & Docker Compose | Multi-stage builds, healthchecks |

---

## 4. Acceptance Criteria Verification Matrix

| # | Acceptance Criterion | Implementation Verification | Status |
|---|---|---|---|
| 1 | A new user can register | `authService.register` + `auth.controller.js` + `/register` UI | PASS |
| 2 | A user can log in and log out | JWT issuance + localStorage state + `/login` UI | PASS |
| 3 | Protected pages require authentication | `ProtectedRoute.jsx` & `auth.middleware.js` | PASS |
| 4 | A user can upload a supported file | Drag-and-drop & native picker in `FileUploadZone.jsx` | PASS |
| 5 | The file is saved persistently | `FileStorageService` writes to `uploads/` directory | PASS |
| 6 | File metadata is stored in PostgreSQL | Prisma `File` model with UUID, BigInt size, relations | PASS |
| 7 | A background processing task starts | `processingService.scheduleProcessing` with `setImmediate` | PASS |
| 8 | Processing lasts ~20–30s for prototype | 5-stage pipeline totaling ~24.5s | PASS |
| 9 | Frontend displays upload progress | Axios `onUploadProgress` updates progress bar | PASS |
| 10 | Frontend displays backend processing progress | `useFileStatus` hook polls and updates bar 25%->100% | PASS |
| 11 | Processing status survives browser refresh | Status read from PostgreSQL record on every load | PASS |
| 12 | Successful processing changes status to COMPLETED | Final stage sets status `COMPLETED` and progress `100` | PASS |
| 13 | Failed processing changes status to FAILED | Corrupted files trigger `FAILED` with error message | PASS |
| 14 | A user can view their uploaded file history | `FileHistory.jsx` with search, filter, and pagination | PASS |
| 15 | A user cannot access another user's private files | User isolation enforced in `file.service.js` (403 Forbidden) | PASS |
| 16 | Dashboard statistics reflect actual database records | `dashboard.repository.js` aggregates PostgreSQL counts | PASS |
| 17 | Application errors are logged | Winston logs to `logs/combined.log` and `logs/error.log` | PASS |
| 18 | Database migrations run successfully | `npx prisma migrate dev` / `prisma migrate deploy` | PASS |
| 19 | Docker Compose starts the complete application | Multi-container setup with postgres, backend, frontend | PASS |
| 20 | Documentation accurately explains how to run project | Complete root `README.md`, `DEPLOYMENT.md`, `API_DOCUMENTATION.md` | PASS |

