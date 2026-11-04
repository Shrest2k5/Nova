# Novastat Frontend Client

Enterprise-grade full-stack file upload and processing management client built with React.js, Vite, Tailwind CSS, React Router DOM, Axios, and Lucide React.

## 1. Architecture Overview

The client adheres to modern React clean architecture principles:

- **State Management (`src/context/`):** React Context API (`AuthContext`) manages user authentication state, tokens, permissions (`USER` vs `ADMIN`), and active sessions.
- **Custom React Hooks (`src/hooks/`):**
  - `useAuth`: Exposes reactive authentication state and helper actions (`login`, `register`, `logout`).
  - `useFileStatus`: Reusable hook responsible for asynchronous background processing polling (every 1.5s) until terminal states (`COMPLETED` or `FAILED`) are reached, with complete automatic cleanup on component unmount.
- **API Services Layer (`src/services/`):**
  - `api.js`: Centralized Axios instance with request/response interceptors for Bearer token injection and automatic 401 session expiry handling.
  - `authService.js`: Encapsulates authentication HTTP calls.
  - `fileService.js`: Encapsulates multipart file uploads with Axios `onUploadProgress`, file retrieval, pagination, filtering, streaming blob downloads, and deletions.
- **Component Modularity (`src/components/`):**
  - `common/`: Reusable primitive components (Button, Input, ProgressBar, StatusBadge, LoadingSpinner, EmptyState, ErrorMessage, ConfirmationModal, StatCard, Navbar, Sidebar).
  - `layout/`: Main app layout shell with responsive sidebar drawer and top header.
  - `dashboard/`: StatsGrid and RecentUploadsTable with live row-level polling.
  - `files/`: FileUploadZone with drag-and-drop and FileTable with search, status filters, and pagination.
- **Pages (`src/pages/`):**
  - `Login.jsx`: Login with validation and demo quick-fill helpers.
  - `Register.jsx`: Account registration with USER/ADMIN role selection.
  - `Dashboard.jsx`: Live PostgreSQL metrics, recent activity, and pipeline overview.
  - `UploadFiles.jsx`: Dedicated upload area with live upload and processing progress indicators.
  - `FileHistory.jsx`: Searchable, filterable, and paginated file inventory.
  - `FileDetails.jsx`: Comprehensive file metadata, live lifecycle progress, blob download, and deletion.
  - `NotFound.jsx`: 404 fallback page.

## 2. Directory Structure

```
client/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── ConfirmationModal.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorMessage.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── dashboard/
│   │   │   ├── RecentUploadsTable.jsx
│   │   │   └── StatsGrid.jsx
│   │   ├── files/
│   │   │   ├── FileTable.jsx
│   │   │   └── FileUploadZone.jsx
│   │   └── layout/
│   │       └── Layout.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useFileStatus.js
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── FileDetails.jsx
│   │   ├── FileHistory.jsx
│   │   ├── Login.jsx
│   │   ├── NotFound.jsx
│   │   ├── Register.jsx
│   │   └── UploadFiles.jsx
│   ├── routes/
│   │   ├── AppRoutes.jsx
│   │   └── ProtectedRoute.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   └── fileService.js
│   ├── utils/
│   │   └── formatters.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── Dockerfile
├── package.json
├── vite.config.js
└── README.md
```

## 3. Real-Time File Status Polling

The frontend utilizes the `useFileStatus` hook:
1. When a file is uploaded, the backend returns a record with status `PENDING`.
2. The hook initiates an asynchronous polling loop every 1,500ms against `GET /api/v1/files/:id/status`.
3. The UI smoothly increments the progress bar as the worker transitions through 25%, 50%, 75%, 90%, and 100%.
4. When status becomes `COMPLETED` or `FAILED`, polling automatically halts.
5. If the user navigates away or unmounts the component, active timeouts are cleanly cancelled.
6. Refreshing the browser preserves the exact current status because progress is retrieved directly from the PostgreSQL database.

## 4. Development & Build

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```
