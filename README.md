# NovaWrite Atlas

NovaWrite Atlas is a production-focused full-stack blogging platform with AI-assisted writing tools, real-time engagement, user/admin dashboards, and live chat.

## Overview

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- Auth: JWT + Firebase Google Sign-In verification
- Media storage: Cloudinary
- Realtime: Socket.IO
- Mail: Nodemailer (welcome login digest)

## Core Features

- Email/password authentication
- Firebase Google login
- Post creation with image upload and SEO tags
- AI tools during post creation:
  - Improve writing
  - Generate SEO tags
  - Generate title suggestions
  - Create summary
  - Convert to LinkedIn format
- Featured feed with filters, tags, and pagination
- Post engagement:
  - Like / unlike
  - Share counter
  - Threaded comments and replies
  - Live readers count
- Real-time personal chat:
  - Presence (online/offline)
  - Typing status
  - Image/link messages
- User profile management:
  - Avatar upload
  - Bio, website, location, LinkedIn
  - Theme preference
  - Password update
- Creator analytics dashboard
- Saved posts/bookmarks
- Admin login and dashboard:
  - Platform stats
  - Manage users/posts
- SEO-ready metadata and branded favicon/logo

## Monorepo Structure

```text
Blog-Platform/
  Client/                  # React frontend
  Server/                  # Express backend
  README.md
```

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- MongoDB (local or Atlas)
- Cloudinary account
- Firebase project (for Google auth)
- SMTP credentials (for login digest emails)

## Environment Variables

### Client (`Client/.env`)

Use `Client/.env.example` as reference:

```env
VITE_API_URL=http://localhost:3000

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Server (`Server/.env`)

Use `Server/.env.example` as base, then add mail settings:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/blogbase

JWT_SECRET_KEY=replace_with_secure_secret
TOKEN_EXPRIES_IN=7d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

FIREBASE_SERVICE_ACCOUNT_PATH=Server/Config/GoogleService.json
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM_NAME=NovaWrite Atlas
LOGIN_MAIL_COOLDOWN_HOURS=12
LOGIN_MAIL_POST_LIMIT=5
```

Notes:
- Configure either `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`.
- `LOGIN_MAIL_COOLDOWN_HOURS` limits how often a user receives login digest mail.

## Local Development

### 1) Install dependencies

```bash
cd Client && npm install
cd ../Server && npm install
```

### 2) Start backend

```bash
cd Server
npm run dev
```

### 3) Start frontend

```bash
cd Client
npm run dev
```

Frontend default: `http://localhost:5173`  
Backend default: `http://localhost:3000`

## Build for Production

```bash
cd Client
npm run build
```

Backend (production):

```bash
cd Server
npm start
```

## API Summary

Base URL: `${VITE_API_URL}/api`

### Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `POST /google`

### Upload and feed (`/api/upload`)

- `POST /uploads`
- `GET /blogs` (pagination + search + category/tag filters)

### Posts and interactions (`/api/posts`)

- `GET /posts?email=...`
- `GET /posts/:id`
- `POST /view/:postType/:postId`
- `POST /ai/enhance`
- `GET /interactions/:postType/:postId`
- `POST /interactions/:postType/:postId/like`
- `POST /interactions/:postType/:postId/share`
- `POST /interactions/:postType/:postId/comments`

### Chat (`/api/chat`) [auth required]

- `POST /conversation`
- `GET /conversations`
- `GET /messages/:conversationId`
- `POST /messages`
- `POST /messages/upload`
- `PATCH /messages/:conversationId/read`
- `DELETE /conversation/:conversationId`

### Users (`/api/users`) [auth required]

- `GET /`
- `GET /menu-stats`
- `GET /bookmarks`
- `POST /bookmarks/:postId`

### Profile (`/api/profile`) [auth required]

- `GET /me`
- `PUT /me`
- `GET /analytics`

### Admin (`/api/admin`)

- `POST /login`
- `GET /dashboard` [admin]
- `DELETE /users/:id` [admin]
- `DELETE /posts/:id` [admin]

## Socket Events

- `presence:update`
- `post:join`
- `post:leave`
- `post:readers-count`
- `post:engagement-updated`
- `conversation:join`
- `conversation:leave`
- `chat:typing`
- `chat:stop-typing`

Socket auth uses JWT (`Authorization: Bearer <token>` or `auth.token`).

## Production Readiness Notes

- Keep all secrets in environment variables.
- Use strong `JWT_SECRET_KEY`.
- Restrict CORS with exact `CLIENT_URL`.
- Enable Cloudinary secure settings and signed uploads where needed.
- Configure SMTP app password (not account password).
- Run behind a reverse proxy (Nginx/Cloudflare) and HTTPS.
- Add rate limiting and request validation for public endpoints (recommended next step).

## Troubleshooting

### Port already in use (`EADDRINUSE`)

If backend `3000` is occupied:

```bash
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or run backend on another port by changing `PORT` in `Server/.env`.

### Firebase invalid API key

- Check all `VITE_FIREBASE_*` values in `Client/.env`.
- Restart Vite dev server after updating env vars.

### Cloudinary upload fails

- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### JWT invalid or expired

- Re-login to refresh token.
- Ensure `JWT_SECRET_KEY` matches between token issuing and verification.

## Scripts

### Client

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

### Server

- `npm run dev`
- `npm start`

## License

This project currently has no explicit open-source license file. Add one before public distribution.
