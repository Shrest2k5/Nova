# Novastat REST API Documentation

Base URL: `http://localhost:5000/api/v1` (or relative `/api/v1` through the frontend reverse proxy)

All protected endpoints require an `Authorization` HTTP header with a valid JSON Web Token:
```http
Authorization: Bearer <jwt-token>
```

---

## 1. Authentication Endpoints

### 1.1 User Registration
Registers a new user account.

- **Method:** `POST`
- **URL:** `/api/v1/auth/register`
- **Auth Required:** No
- **Rate Limit:** 20 requests per 15 minutes per IP

#### Request Body
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!",
  "role": "USER"
}
```
*Note: `role` is optional and defaults to `"USER"`. Allowed values: `"USER"`, `"ADMIN"`.*

#### Successful Response (201 Created)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "7f920806-cd82-4aa4-8f78-a006399a9a3b",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "USER",
      "createdAt": "2026-11-03T12:00:00.000Z",
      "updatedAt": "2026-11-03T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
- **400 Bad Request:** Validation errors (e.g. short password, invalid email format).
- **409 Conflict:** Email address is already registered.

---

### 1.2 User Login
Authenticates an existing user and returns a signed JWT.

- **Method:** `POST`
- **URL:** `/api/v1/auth/login`
- **Auth Required:** No
- **Rate Limit:** 20 requests per 15 minutes per IP

#### Request Body
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "7f920806-cd82-4aa4-8f78-a006399a9a3b",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "USER",
      "createdAt": "2026-11-03T12:00:00.000Z",
      "updatedAt": "2026-11-03T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses
- **400 Bad Request:** Missing email or password.
- **401 Unauthorized:** Invalid email or password credentials.

---

### 1.3 Get Current Authenticated User Profile
Retrieves the profile of the user identified by the JWT.

- **Method:** `GET`
- **URL:** `/api/v1/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Current user profile fetched successfully",
  "data": {
    "id": "7f920806-cd82-4aa4-8f78-a006399a9a3b",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "USER",
    "createdAt": "2026-11-03T12:00:00.000Z"
  }
}
```

#### Error Responses
- **401 Unauthorized:** Missing, expired, or malformed authentication token.

---

### 1.4 User Logout
Terminates user session client-side.

- **Method:** `POST`
- **URL:** `/api/v1/auth/logout`
- **Auth Required:** Yes (`Bearer <token>`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## 2. User Administration Endpoints

### 2.1 List All Users
Retrieves a paginated list of registered users. Restricted to `ADMIN` role.

- **Method:** `GET`
- **URL:** `/api/v1/users?page=1&limit=20`
- **Auth Required:** Yes (`ADMIN` role)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "7f920806-cd82-4aa4-8f78-a006399a9a3b",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "USER",
      "createdAt": "2026-11-03T12:00:00.000Z",
      "_count": {
        "files": 4
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Error Responses
- **401 Unauthorized:** Unauthenticated.
- **403 Forbidden:** Authenticated user role is not `ADMIN`.

---

### 2.2 Get User by ID
Retrieves details for a specific user.

- **Method:** `GET`
- **URL:** `/api/v1/users/:id`
- **Auth Required:** Yes (`ADMIN` or Self)

#### Error Responses
- **403 Forbidden:** Cannot view another user's profile unless `ADMIN`.
- **404 Not Found:** User ID not found.

---

## 3. File Management Endpoints

### 3.1 Upload File
Accepts a single multipart file, writes to persistent storage, creates a database record with status `PENDING`, and queues asynchronous background processing (~25s workflow). Returns promptly.

- **Method:** `POST`
- **URL:** `/api/v1/files/upload`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `multipart/form-data`

#### Form Data Parameters
| Field | Type | Description |
|---|---|---|
| `file` | Binary | File to upload (Max 50MB; PDF, Image, ZIP, TXT, JSON, CSV, DOCX, XLSX) |

#### Successful Response (201 Created)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "File uploaded successfully and processing initiated",
  "data": {
    "id": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "userId": "7f920806-cd82-4aa4-8f78-a006399a9a3b",
    "originalName": "annual_report.pdf",
    "storedName": "1793711928000-0e7f7b3c2a1e-annual_report.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "storagePath": "C:\\Novastat\\server\\uploads\\1793711928000-0e7f7b3c2a1e-annual_report.pdf",
    "status": "PENDING",
    "progress": 0,
    "errorMessage": null,
    "createdAt": "2026-11-03T12:05:00.000Z",
    "updatedAt": "2026-11-03T12:05:00.000Z",
    "completedAt": null
  }
}
```

#### Error Responses
- **400 Bad Request:** Unsupported file extension, invalid MIME type, missing file, or file exceeds 50MB.

---

### 3.2 List User Files
Lists files uploaded by the authenticated user with filtering, pagination, and search.

- **Method:** `GET`
- **URL:** `/api/v1/files?page=1&limit=10&status=ALL&search=report`
- **Auth Required:** Yes (`Bearer <token>`)

#### Query Parameters
- `page` (optional integer, default `1`)
- `limit` (optional integer, default `10`, max `100`)
- `status` (optional: `ALL`, `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)
- `search` (optional string: case-insensitive match on original filename)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Files retrieved successfully",
  "data": [
    {
      "id": "3bb609b5-c08d-4e94-82ce-f6b907409214",
      "originalName": "annual_report.pdf",
      "mimeType": "application/pdf",
      "size": 1048576,
      "status": "COMPLETED",
      "progress": 100,
      "createdAt": "2026-11-03T12:05:00.000Z",
      "completedAt": "2026-11-03T12:05:25.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.3 Get File Details
Retrieves full metadata for an individual file.

- **Method:** `GET`
- **URL:** `/api/v1/files/:id`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Error Responses
- **403 Forbidden:** Attempting to view another user's file.
- **404 Not Found:** File ID does not exist.

---

### 3.4 Get Live File Status
Retrieves current lifecycle processing progress (polled by frontend hook every 1-2s).

- **Method:** `GET`
- **URL:** `/api/v1/files/:id/status`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "File status retrieved successfully",
  "data": {
    "fileId": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "id": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "filename": "annual_report.pdf",
    "status": "PROCESSING",
    "processingStage": "EXTRACTION",
    "progress": 50,
    "errorMessage": null,
    "pageCount": 12,
    "completedAt": null,
    "createdAt": "2026-11-03T12:05:00.000Z",
    "updatedAt": "2026-11-03T12:05:15.000Z"
  }
}
```

---

### 3.5 Get Extracted Text
Retrieves the raw text extracted from all pages of the document along with page count metadata.

- **Method:** `GET`
- **URL:** `/api/v1/files/:id/extracted-text`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Extracted text retrieved successfully",
  "data": {
    "fileId": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "originalName": "annual_report.pdf",
    "pageCount": 12,
    "extractedText": "--- Page 1 ---\nAnnual Financial Report 2026...\n\n--- Page 2 ---\nExecutive Summary...",
    "status": "COMPLETED",
    "processingStage": "COMPLETED"
  }
}
```

#### Error Responses
- **400 Bad Request:** Document processing failed before text could be extracted.
- **401 Unauthorized:** Missing or invalid authentication token.
- **403 Forbidden:** Access denied (not file owner or admin).
- **404 Not Found:** File ID does not exist.

---

### 3.6 Get AI Document Summary
Retrieves the structured Google Gemini AI summary containing title, overview, bulleted key points, terminology dictionary, key facts, and conclusion.

- **Method:** `GET`
- **URL:** `/api/v1/files/:id/summary`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Document summary retrieved successfully",
  "data": {
    "fileId": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "originalName": "annual_report.pdf",
    "status": "COMPLETED",
    "processingStage": "COMPLETED",
    "summary": {
      "title": "Novastat Annual Financial & Architecture Report 2026",
      "overview": "Comprehensive overview detailing cloud migration, architectural scalability, and fiscal performance.",
      "keyPoints": [
        "Cloud storage footprint increased by 45% while reducing latency.",
        "PostgreSQL and Prisma ORM delivered 99.98% query availability.",
        "Automated Gemini AI document pipeline adopted across all business units."
      ],
      "importantTerms": [
        {
          "term": "Relational Consistency",
          "definition": "Database design ensuring strict ACID compliance through PostgreSQL foreign keys and Prisma schema migrations."
        }
      ],
      "importantFacts": [
        "Revenue increased 28% year-over-year.",
        "Average document processing turnaround reduced to 18 seconds."
      ],
      "conclusion": "The platform achieved all technical and fiscal performance benchmarks for fiscal year 2026."
    }
  }
}
```

#### Error Responses
- **400 Bad Request:** Processing failed, or API key configuration missing.
- **401 Unauthorized:** Unauthenticated.
- **403 Forbidden:** Unauthorized user.
- **404 Not Found:** Summary not found or document does not exist.

---

### 3.7 Reprocess Document
Allows authorized users to retry failed processing or re-run the 4-stage extraction and Gemini AI summarization pipeline without re-uploading the physical file.

- **Method:** `POST`
- **URL:** `/api/v1/files/:id/reprocess`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Document reprocessing scheduled successfully",
  "data": {
    "fileId": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "status": "PENDING",
    "processingStage": "VALIDATION",
    "progress": 0,
    "message": "Document reprocessing successfully queued."
  }
}
```

#### Error Responses
- **400 Bad Request:** File is currently in the active processing queue.
- **403 Forbidden:** Unauthorized user.
- **404 Not Found:** File or physical storage payload not found.

---

### 3.8 Download Completed File
Streams the physical file from persistent storage with `Content-Disposition: attachment`.

- **Method:** `GET`
- **URL:** `/api/v1/files/:id/download`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Error Responses
- **400 Bad Request:** Cannot download file in `FAILED` status.
- **403 Forbidden:** Unauthorized access.
- **404 Not Found:** Physical file or record not found.

---

### 3.6 Delete File
Cancels active processing if in progress, unlinks the file from persistent storage, and deletes the record from PostgreSQL.

- **Method:** `DELETE`
- **URL:** `/api/v1/files/:id`
- **Auth Required:** Yes (File Owner or `ADMIN`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "id": "3bb609b5-c08d-4e94-82ce-f6b907409214",
    "deleted": true
  }
}
```

---

## 4. Dashboard Endpoints

### 4.1 Get Dashboard Statistics
Returns aggregated database counts for total, completed, processing, pending, and failed files, plus disk usage.

- **Method:** `GET`
- **URL:** `/api/v1/dashboard/stats`
- **Auth Required:** Yes (`Bearer <token>`)

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "total": 12,
    "completed": 10,
    "processing": 1,
    "pending": 0,
    "failed": 1,
    "totalStorageBytes": 52428800
  }
}
```

---

### 4.2 Get Recent Uploads
Returns the most recent uploads for the dashboard feed.

- **Method:** `GET`
- **URL:** `/api/v1/dashboard/recent-uploads?limit=5`
- **Auth Required:** Yes (`Bearer <token>`)

---

## 5. System Health Check

### 5.1 Service Health
Verifies database connectivity, uptime, and service status.

- **Method:** `GET`
- **URL:** `/api/v1/health`
- **Auth Required:** No

#### Successful Response (200 OK)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Service health status",
  "data": {
    "status": "OK",
    "database": "healthy",
    "uptime": 124.5,
    "timestamp": "2026-11-03T12:00:00.000Z",
    "service": "novastat-backend"
  }
}
```

