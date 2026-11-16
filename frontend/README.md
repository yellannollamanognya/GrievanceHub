# GrievanceHub Frontend

React + Vite frontend for the GrievanceHub campus grievance management system.

## Requirements
- Node.js 18+
- Backend running at `http://localhost:5000`
- MySQL database configured in the backend

## Setup
```bash
npm install
cp .env.example .env
npm run dev
```
Open the URL printed by Vite (normally `http://localhost:5173`).

Set `VITE_API_BASE_URL` in `.env` if your backend uses another host or port.

## Backend API contract used

All paths below are relative to `/api`.

### Authentication
- `POST /auth/login` **required common-login backend endpoint**
- `POST /auth/register/student`
- `GET /auth/profile`
- `GET /auth/staff-profile`
- `GET /auth/admin-profile`

The backend currently shared by the project has separate `POST /auth/login/student`,
`/auth/login/staff`, and `/auth/login/admin` routes. This frontend intentionally calls
one common endpoint. Add `POST /auth/login` to the backend before testing login.
Expected request: `{ "email": "...", "password": "..." }`.
Expected response: `{ "success": true, "token": "...", "user": { "user_id": 1,
"name": "...", "email": "...", "role": "STUDENT|STAFF|ADMIN" } }`.

### Complaints
- `POST /complaints/`
- `GET /complaints/my`
- `GET /complaints/:id/history`
- `POST /complaints/:id/comments`
- `GET /complaints/:id/comments`
- `POST /complaints/:id/attachments` (multipart field name: `file`)
- `GET /complaints/:id/attachments`
- `GET /complaints/:id/attachments/:attachmentId/download`
- `POST /complaints/:id/feedback`
- `GET /complaints/:id/feedback`
- `GET /complaints/staff/assigned`
- `PATCH /complaints/:id/status`

### Admin
- `GET /admin/dashboard`
- `GET /admin/complaints`
- `POST /admin/complaints/:id/assign`
- `POST /admin/staff`
- `GET /admin/staff`

## Important integration notes
1. The frontend uses only routes shown in the backend route files you supplied, except the
   common-login route described above.
2. Request body names for complaint/comment/feedback/assignment are set to the names used
   in the supplied controller/schema context. If your controller validates different names,
   update `src/services/*` in one place.
3. The complaint submission page uses `category_id`, `department_id`, `title`, `description`,
   `location`, and `priority`. It currently provides category and department IDs as inputs
   because no public category/department listing routes were present in the shared backend.
4. No category/department/staff creation/list API beyond the admin staff list was invented.
5. Reopening is presented only if the backend supports it; no reopen route exists in the
   supplied routes, so the frontend does not pretend that it can call one.
6. File downloads are handled as authenticated blob requests.

## Folder layout
```text
src/
  components/       shared layout, guards, status badge
  context/          authentication state
  pages/            login, registration, role dashboards, complaint pages
  services/         axios instance and API functions
  styles/           global styles
```
