# IDMxPPM Central Database API — User Manual

## Table of Contents

1. [Overview](#1-overview)
2. [System Requirements](#2-system-requirements)
3. [Server Deployment](#3-server-deployment)
   - 3.1 [Docker Deployment (Recommended)](#31-docker-deployment-recommended)
   - 3.2 [Manual Deployment](#32-manual-deployment)
   - 3.3 [Environment Configuration](#33-environment-configuration)
4. [Connecting from the Desktop App](#4-connecting-from-the-desktop-app)
   - 4.1 [Establishing a Connection](#41-establishing-a-connection)
   - 4.2 [Creating an Account](#42-creating-an-account)
   - 4.3 [Logging In](#43-logging-in)
   - 4.4 [Connection Status Indicators](#44-connection-status-indicators)
5. [Working with Server Specifications](#5-working-with-server-specifications)
   - 5.1 [Browsing Specifications](#51-browsing-specifications)
   - 5.2 [Opening a Specification from the Server](#52-opening-a-specification-from-the-server)
   - 5.3 [Saving a Specification to the Server](#53-saving-a-specification-to-the-server)
   - 5.4 [Deleting a Specification](#54-deleting-a-specification)
6. [REST API Reference](#6-rest-api-reference)
   - 6.1 [Authentication](#61-authentication)
   - 6.2 [Specifications](#62-specifications)
   - 6.3 [Health Check](#63-health-check)
7. [User Roles and Permissions](#7-user-roles-and-permissions)
8. [Administration](#8-administration)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

The IDMxPPM Central Database API enables organizations to centrally manage all their IDM (Information Delivery Manual) specifications in a shared MongoDB database. Team members can browse, open, edit, and save specifications from the IDMxPPM desktop application to a self-hosted server.

**Key features:**
- Central storage of IDM specifications with full project data
- User authentication with role-based access (viewer, editor, admin)
- Full-text search and filtering by status, author, and tags
- Pagination for efficient browsing of large specification libraries
- Self-hosted deployment via Docker for organizational privacy
- 100% backward-compatible — all local file operations remain fully functional

**Stack:** Node.js, Express, MongoDB 7, Mongoose, JWT, Docker

---

## 2. System Requirements

### Server
| Component | Requirement |
|-----------|-------------|
| OS | Any OS that supports Docker (Linux, macOS, Windows) |
| Docker | Docker Engine 20+ and Docker Compose v2+ |
| RAM | 1 GB minimum (2 GB recommended) |
| Disk | 1 GB minimum + storage for specifications |
| Network | Accessible from client machines (same LAN or VPN) |

### Client (Desktop App)
| Component | Requirement |
|-----------|-------------|
| IDMxPPM | Neo Seoul Edition v1.1.0+ |
| Network | HTTP/HTTPS access to the server |

---

## 3. Server Deployment

### 3.1 Docker Deployment (Recommended)

Docker Compose starts both MongoDB and the API server in a single command.

**Step 1: Navigate to the server directory**

```bash
cd server
```

**Step 2: Create the environment file**

```bash
cp .env.example .env
```

**Step 3: Edit `.env` with your settings**

Open `.env` in a text editor and configure:

```bash
# MongoDB credentials
MONGODB_URI=mongodb://admin:changeme@mongo:27017/idmxppm?authSource=admin

# IMPORTANT: Change this to a strong random key in production
JWT_SECRET=your-secret-key-at-least-32-characters-long

# JWT token expiration (default: 7 days)
JWT_EXPIRES_IN=7d

# Server port
PORT=3001

# Allowed origins for CORS (comma-separated, or * for all)
CORS_ORIGINS=*

# Allow new user registration (set to false after initial setup if desired)
ALLOW_OPEN_REGISTRATION=true
```

**Step 4: Start the containers**

```bash
docker-compose up -d
```

This starts two containers:
- `idmxppm-mongo` — MongoDB 7 database with persistent storage
- `idmxppm-api` — Node.js API server on port 3001

**Step 5: Verify the deployment**

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 5,
  "timestamp": "2026-02-06T12:00:00.000Z"
}
```

**Managing the server:**

```bash
# View logs
docker-compose logs -f api

# Stop the server
docker-compose down

# Stop and remove all data (WARNING: deletes all specifications)
docker-compose down -v

# Restart after configuration change
docker-compose down && docker-compose up -d
```

### 3.2 Manual Deployment

If Docker is not available, you can run the server directly with Node.js and a MongoDB instance.

**Prerequisites:**
- Node.js 20+
- MongoDB 7 running locally or on a reachable host

```bash
cd server
npm install
cp .env.example .env
# Edit .env — set MONGODB_URI to your MongoDB connection string
node src/index.js
```

### 3.3 Environment Configuration

All configuration is done through environment variables (`.env` file or Docker Compose variables):

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/idmxppm` | MongoDB connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secret key for signing JWT tokens. **Must be changed in production.** |
| `JWT_EXPIRES_IN` | `7d` | Token expiration duration (e.g., `1h`, `7d`, `30d`) |
| `PORT` | `3001` | HTTP port the API listens on |
| `NODE_ENV` | `development` | Set to `production` for deployment |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated), or `*` for all |
| `ALLOW_OPEN_REGISTRATION` | `true` | Set to `false` to prevent new user self-registration |

**Docker Compose specific variables** (set in the shell or a `.env` file alongside `docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_ROOT_USER` | `admin` | MongoDB root username |
| `MONGO_ROOT_PASSWORD` | `changeme` | MongoDB root password. **Must be changed.** |
| `API_PORT` | `3001` | Host port mapping for the API |

---

## 4. Connecting from the Desktop App

### 4.1 Establishing a Connection

There are three ways to open the Server Connection dialog:

1. **Menu Bar:** Click the **Server icon** (two stacked rectangles) in the left vertical menu bar
2. **File Menu (Electron):** Go to **File > Connect to Server...**
3. **Status Bar:** Click the **Server** indicator in the bottom status bar (when connected)

In the connection dialog:

1. Enter the server URL (e.g., `http://192.168.1.100:3001` or `http://localhost:3001`)
2. Click **Test Connection**
3. A green checkmark confirms the server is reachable

### 4.2 Creating an Account

After a successful connection, you can register a new account:

1. Click the **Register** tab in the connection dialog
2. Fill in the required fields:
   - **Email** — your email address (used as login identifier)
   - **Password** — minimum 6 characters
   - **Given Name** — your first name
   - **Family Name** — your last name
   - **Organization** — your organization name (optional)
3. Click **Register**

> **Note:** The first user to register on a fresh server is automatically assigned the **admin** role. All subsequent users receive the **editor** role by default. Administrators can change user roles as needed.

> **Note:** If `ALLOW_OPEN_REGISTRATION` is set to `false` on the server, only the first user (admin bootstrap) can self-register. All other accounts must be created by an administrator.

### 4.3 Logging In

If you already have an account:

1. Enter your **Email** and **Password** in the Login tab
2. Click **Login**
3. The dialog shows your connected status with your name and organization

Your session persists across app restarts (JWT token stored in local storage). Tokens expire according to the server's `JWT_EXPIRES_IN` setting (default: 7 days).

### 4.4 Connection Status Indicators

| Location | Indicator | Meaning |
|----------|-----------|---------|
| Vertical Menu Bar | Green dot on Server icon | Connected and authenticated |
| Vertical Menu Bar | No dot on Server icon | Not connected |
| Status Bar | Green "Server" text | Connected to server |
| Status Bar | Green "Server (synced)" text | Current spec was loaded from / saved to server |
| Startup Screen | "Open from Server" button visible | Connected and authenticated |

The app checks server connectivity every 60 seconds. If the connection is lost, the status indicator updates automatically.

---

## 5. Working with Server Specifications

### 5.1 Browsing Specifications

When connected and authenticated, the **Server Browser** lets you search and browse all specifications stored on the server.

**Opening the Browser:**
- Click **Open from Server** on the Startup Screen, or
- Use the Server Browser through the export/save workflow

**Browser features:**
- **Search** — full-text search across specification titles and short titles
- **Status Filter** — filter by IDM workflow status (NP, WD, CD, DIS, IS)
- **Sortable Columns** — click column headers to sort by Title, Status, Version, Author, ERs, or Last Modified
- **Pagination** — navigate through large specification libraries (15 specs per page)

**Status codes:**

| Code | Full Name | Description |
|------|-----------|-------------|
| NP | New Proposal | Initial draft, not yet circulated |
| WD | Working Draft | Under active development |
| CD | Committee Draft | Under committee review |
| DIS | Draft International Standard | Formal review stage |
| IS | International Standard | Published/finalized |

### 5.2 Opening a Specification from the Server

1. In the Server Browser, find the specification you want to open
2. Click the **Open** button on its row
3. The specification loads into the editor with all its data:
   - BPMN process map
   - Header information
   - Exchange Requirements hierarchy
   - ER data and library

The status bar shows **"Server (synced)"** to indicate the active spec is linked to the server.

> **Note:** Opening a server spec replaces any currently open project. If you have unsaved changes, save them first.

### 5.3 Saving a Specification to the Server

**Saving an existing server spec (update):**

1. Go to **Save & Export** in the vertical menu bar
2. Select **Save to Server** as the export format
3. Click **Export** / **Save**
4. The specification is updated on the server. Only the owner or an admin can update a spec.

**Saving a new local spec to the server:**

1. Open or create a specification locally
2. Go to **Save & Export** > select **Save to Server**
3. Click **Export** / **Save**
4. A new specification is created on the server. You become the owner.

> **Note:** The "Save to Server" option only appears in the export dialog when you are connected and authenticated.

### 5.4 Deleting a Specification

1. In the Server Browser, click the **trash icon** (🗑) next to a specification
2. Confirm the deletion when prompted
3. The specification is permanently removed from the server

> **Note:** Only the spec owner or an admin can delete a specification.

---

## 6. REST API Reference

Base URL: `http://<server-host>:3001`

All authenticated endpoints require the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

### 6.1 Authentication

#### POST `/api/auth/register`

Create a new user account.

**Auth required:** No

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": {
    "givenName": "John",
    "familyName": "Doe"
  },
  "organization": "Acme Corp"
}
```

**Required fields:** `email`, `password` (min 6 chars), `name.givenName`, `name.familyName`

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "65a1b2c3d4e5f6...",
    "email": "user@example.com",
    "name": { "givenName": "John", "familyName": "Doe" },
    "organization": "Acme Corp",
    "role": "editor",
    "isActive": true,
    "createdAt": "2026-02-06T12:00:00.000Z"
  }
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing required fields or password too short |
| 403 | Open registration disabled and users already exist |
| 409 | Email already registered |

---

#### POST `/api/auth/login`

Authenticate an existing user.

**Auth required:** No

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "65a1b2c3d4e5f6...",
    "email": "user@example.com",
    "name": { "givenName": "John", "familyName": "Doe" },
    "organization": "Acme Corp",
    "role": "editor",
    "isActive": true,
    "lastLogin": "2026-02-06T12:00:00.000Z",
    "createdAt": "2026-01-15T08:00:00.000Z"
  }
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing email or password |
| 401 | Invalid email or password |

---

#### GET `/api/auth/me`

Get the current authenticated user's profile.

**Auth required:** Yes

**Response (200 OK):**
```json
{
  "user": {
    "_id": "65a1b2c3d4e5f6...",
    "email": "user@example.com",
    "name": { "givenName": "John", "familyName": "Doe" },
    "organization": "Acme Corp",
    "role": "editor",
    "isActive": true,
    "lastLogin": "2026-02-06T12:00:00.000Z",
    "createdAt": "2026-01-15T08:00:00.000Z"
  }
}
```

---

#### PUT `/api/auth/me`

Update the current user's profile.

**Auth required:** Yes

**Request body** (all fields optional):
```json
{
  "name": {
    "givenName": "Jane",
    "familyName": "Doe"
  },
  "organization": "New Organization"
}
```

**Response (200 OK):** Same format as GET `/api/auth/me`.

---

#### PUT `/api/auth/password`

Change the current user's password.

**Auth required:** Yes

**Request body:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

**Response (200 OK):**
```json
{
  "message": "Password updated"
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing fields or new password too short (min 6 chars) |
| 401 | Current password incorrect |

---

### 6.2 Specifications

#### GET `/api/specs`

List all specifications. Returns metadata only (no `projectData`) for efficient browsing.

**Auth required:** Yes

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | — | Full-text search on title and shortTitle |
| `status` | string | — | Filter by status (`NP`, `WD`, `CD`, `DIS`, `IS`) |
| `owner` | string | — | Filter by owner user ID |
| `tag` | string | — | Filter by tag |
| `page` | number | `1` | Page number (1-based) |
| `limit` | number | `20` | Items per page (max 100) |
| `sort` | string | `updatedAt` | Sort field (e.g., `title`, `status`, `createdAt`, `updatedAt`, `erCount`) |
| `order` | string | `desc` | Sort order (`asc` or `desc`) |

**Response (200 OK):**
```json
{
  "specs": [
    {
      "_id": "65a1b2c3d4e5f6...",
      "title": "GDE-IDM: General Design Envelope",
      "shortTitle": "GDE-IDM",
      "status": "WD",
      "version": "1.0",
      "idmGuid": "550e8400-e29b-41d4-a716-446655440000",
      "erCount": 5,
      "language": "EN",
      "tags": ["architecture", "design"],
      "owner": {
        "_id": "65a0...",
        "name": { "givenName": "John", "familyName": "Doe" },
        "email": "john@example.com",
        "organization": "Acme Corp"
      },
      "createdAt": "2026-01-20T10:00:00.000Z",
      "updatedAt": "2026-02-05T15:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 3
}
```

---

#### GET `/api/specs/:id`

Get a single specification with its full `projectData`.

**Auth required:** Yes

**Response (200 OK):**
```json
{
  "spec": {
    "_id": "65a1b2c3d4e5f6...",
    "title": "GDE-IDM: General Design Envelope",
    "shortTitle": "GDE-IDM",
    "status": "WD",
    "version": "1.0",
    "erCount": 5,
    "owner": {
      "_id": "65a0...",
      "name": { "givenName": "John", "familyName": "Doe" },
      "email": "john@example.com",
      "organization": "Acme Corp"
    },
    "lastEditedBy": {
      "_id": "65a0...",
      "name": { "givenName": "John", "familyName": "Doe" },
      "email": "john@example.com"
    },
    "projectData": {
      "version": "2.0.0",
      "appName": "IDMxPPM - Neo Seoul",
      "bpmnXml": "<?xml version=\"1.0\"...>",
      "headerData": { "title": "...", "shortTitle": "...", "status": "WD" },
      "erHierarchy": [...],
      "dataObjectErMap": {...},
      "erDataMap": {...},
      "erLibrary": [...],
      "savedAt": "2026-02-05T15:30:00.000Z"
    },
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-02-05T15:30:00.000Z"
  }
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 404 | Specification not found |

---

#### POST `/api/specs`

Create a new specification.

**Auth required:** Yes

**Request body:**
```json
{
  "projectData": {
    "version": "2.0.0",
    "appName": "IDMxPPM - Neo Seoul",
    "bpmnXml": "<?xml version=\"1.0\"...>",
    "headerData": {
      "title": "My IDM Specification",
      "shortTitle": "MyIDM",
      "status": "NP",
      "version": "1.0"
    },
    "erHierarchy": [...],
    "dataObjectErMap": {...},
    "erDataMap": {...},
    "erLibrary": [...]
  }
}
```

The server automatically extracts metadata (title, shortTitle, status, version, erCount, language, tags) from `projectData.headerData` and `projectData.erHierarchy`.

**Response (201 Created):**
```json
{
  "spec": {
    "_id": "65a1b2c3d4e5f6...",
    "title": "My IDM Specification",
    "shortTitle": "MyIDM",
    "status": "NP",
    "version": "1.0",
    "erCount": 3,
    "owner": "65a0...",
    "createdAt": "2026-02-06T12:00:00.000Z",
    "updatedAt": "2026-02-06T12:00:00.000Z"
  }
}
```

> **Note:** The response does not include `projectData` to reduce payload size. Use GET `/api/specs/:id` to retrieve the full data.

---

#### PUT `/api/specs/:id`

Update an existing specification. Only the owner or an admin can update.

**Auth required:** Yes

**Request body:**
```json
{
  "projectData": {
    "version": "2.0.0",
    "appName": "IDMxPPM - Neo Seoul",
    "bpmnXml": "...",
    "headerData": { ... },
    "erHierarchy": [...],
    "dataObjectErMap": { ... },
    "erDataMap": { ... },
    "erLibrary": [...]
  }
}
```

**Response (200 OK):** Same format as POST (without `projectData`).

**Error responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing `projectData` |
| 403 | Not the owner and not an admin |
| 404 | Specification not found |

---

#### DELETE `/api/specs/:id`

Delete a specification permanently. Only the owner or an admin can delete.

**Auth required:** Yes

**Response (200 OK):**
```json
{
  "message": "Specification deleted"
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the owner and not an admin |
| 404 | Specification not found |

---

### 6.3 Health Check

#### GET `/api/health`

Check server and database status.

**Auth required:** No

**Response (200 OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 3600,
  "timestamp": "2026-02-06T12:00:00.000Z"
}
```

The `status` field returns:
- `"ok"` — server and database are healthy
- `"degraded"` — server is running but database is not connected

---

## 7. User Roles and Permissions

| Role | Browse Specs | Open Specs | Create Specs | Update Own Specs | Update Others' Specs | Delete Own Specs | Delete Others' Specs |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **viewer** | Yes | Yes | Yes | Yes | No | Yes | No |
| **editor** | Yes | Yes | Yes | Yes | No | Yes | No |
| **admin** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

**Role assignment:**
- The **first user** to register on a fresh server is automatically assigned the `admin` role
- All subsequent users receive the `editor` role by default
- Only admins can modify or delete other users' specifications

> **Note:** In the current version, the `viewer` and `editor` roles have the same permissions. The `viewer` role is reserved for future read-only access restrictions.

---

## 8. Administration

### Initial Setup

1. Deploy the server (see [Section 3](#3-server-deployment))
2. Register the first user account — this becomes the admin
3. Optionally set `ALLOW_OPEN_REGISTRATION=false` to prevent self-registration
4. Create additional user accounts as needed

### Security Recommendations

1. **Change the JWT secret** — Replace the default `JWT_SECRET` with a strong random string (at least 32 characters)
2. **Change MongoDB credentials** — Replace the default `admin:changeme` with strong credentials
3. **Restrict CORS origins** — Set `CORS_ORIGINS` to your organization's specific origins instead of `*`
4. **Use HTTPS** — Place the API behind a reverse proxy (nginx, Caddy) with TLS for production
5. **Disable open registration** — After initial setup, set `ALLOW_OPEN_REGISTRATION=false`
6. **Network isolation** — Run the server on an internal network or VPN, not exposed to the public internet

### Backup

MongoDB data is persisted in Docker volumes. To back up:

```bash
# Dump the database
docker exec idmxppm-mongo mongodump --uri="mongodb://admin:changeme@localhost:27017/idmxppm?authSource=admin" --out=/dump

# Copy the dump to the host
docker cp idmxppm-mongo:/dump ./backup-$(date +%Y%m%d)
```

To restore:
```bash
docker cp ./backup-20260206 idmxppm-mongo:/dump
docker exec idmxppm-mongo mongorestore --uri="mongodb://admin:changeme@localhost:27017/idmxppm?authSource=admin" /dump
```

### Rate Limiting

The server enforces rate limits to prevent abuse:

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| General API (`/api/*`) | 200 requests | 15 minutes |
| Authentication (`/api/auth/login`, `/api/auth/register`) | 20 requests | 15 minutes |

---

## 9. Troubleshooting

### Connection Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Test Connection" fails | Server not running or unreachable | Verify server is running: `curl http://<host>:3001/api/health` |
| "Test Connection" fails | Firewall blocking port 3001 | Open port 3001 on the server firewall |
| "Server unreachable" after initial success | Network change or server restart | Click the Server icon to reconnect |

### Authentication Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Session expired" error | JWT token expired | Log in again through the Server Connection dialog |
| "Open registration is disabled" | `ALLOW_OPEN_REGISTRATION=false` | Contact the server admin to create your account |
| "Invalid email or password" | Wrong credentials | Check your email and password; passwords are case-sensitive |

### Data Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Spec not appearing in browser | Search filter active | Clear the search box and status filter |
| "Not authorized to update" | You are not the spec owner | Contact the owner or an admin |
| Save fails with timeout | Very large project data (>50MB) | Reduce image sizes in the project |

### Server Logs

View API server logs for detailed error information:

```bash
# Docker
docker-compose logs -f api

# Manual deployment
# Logs are printed to stdout in dev mode (morgan)
```

### Health Check Details

| `database` value | Meaning |
|-----------------|---------|
| `connected` | MongoDB is connected and operational |
| `connecting` | MongoDB connection is being established |
| `disconnected` | MongoDB is not connected — check MongoDB container |

---

## Appendix: Data Model

### User Schema

| Field | Type | Description |
|-------|------|-------------|
| `email` | String (unique) | Login identifier, stored lowercase |
| `name.givenName` | String | First name |
| `name.familyName` | String | Last name |
| `organization` | String | Organization name |
| `role` | Enum: `viewer`, `editor`, `admin` | Access level |
| `isActive` | Boolean | Account active status |
| `lastLogin` | Date | Timestamp of last login |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last profile update timestamp |

### IdmSpec Schema

| Field | Type | Description |
|-------|------|-------------|
| `owner` | ObjectId (ref: User) | User who created the spec |
| `lastEditedBy` | ObjectId (ref: User) | User who last saved the spec |
| `title` | String | Full title (denormalized from projectData) |
| `shortTitle` | String | Short title (denormalized) |
| `status` | Enum: `NP`, `WD`, `CD`, `DIS`, `IS` | IDM workflow status |
| `version` | String | Version number |
| `idmGuid` | String | Persistent IDM GUID |
| `projectData` | Mixed (JSON) | Full `.idm` project data (BPMN, headers, ERs, library) |
| `erCount` | Number | Total ER count (denormalized, recursive) |
| `language` | String | ISO 639-1 language code |
| `tags` | String[] | Keywords from header data |
| `createdAt` | Date | Spec creation timestamp |
| `updatedAt` | Date | Last modification timestamp |

The `projectData` field stores the identical JSON structure as the local `.idm` file format:

```
projectData
├── version         — Schema version (e.g., "2.0.0")
├── appName         — "IDMxPPM - Neo Seoul"
├── bpmnXml         — BPMN 2.0 XML string
├── headerData      — IDM header (title, authors, status, phases, etc.)
├── erHierarchy     — Root ER with nested sub-ERs and information units
├── dataObjectErMap — BPMN Data Object → ER ID associations
├── erDataMap       — Legacy ER data (backward compatibility)
├── erLibrary       — Saved ER templates
└── savedAt         — ISO 8601 timestamp
```
