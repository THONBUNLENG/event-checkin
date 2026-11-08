# EventCheckin PWA

A multi-user QR event check-in system built with:

- React + Vite
- Tailwind CSS
- Node.js + Express
- MySQL
- JWT authentication
- QR generation
- Mobile QR scanning
- PWA install support

## Features

- User login/logout
- Per-user data isolation
- Dashboard statistics
- Department CRUD
- Position CRUD
- Event CRUD
- Participant CRUD
- Register participants to events
- Automatic event-specific QR token
- Participation card with QR code
- Print/download-ready card
- Event QR scanner
- Duplicate check-in protection
- Attendance list and filtering
- PWA manifest/service worker

## Requirements

- Node.js 20+
- MySQL 8+

## 1. Database

Create a database and run:

```bash
mysql -u root -p < database/schema.sql
```

Then edit `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=event_checkin
JWT_SECRET=replace_with_a_long_random_secret
```

## 2. Start API

```bash
cd server
npm install
npm run dev
```

API: http://localhost:5000

## 3. Start frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend: http://localhost:5175

## Demo account

Run:

```bash
cd server
npm run seed
```

Login:

- Email: admin@example.com
- Password: admin123

Change the password before production.

## Camera / PWA note

Camera access requires a secure context in production (HTTPS). `localhost` is normally allowed for development.

For a phone on the same LAN, use an HTTPS tunnel or deploy the app over HTTPS.

## Production

Build frontend:

```bash
cd client
npm run build
```

Run API:

```bash
cd server
npm start
```

Set `VITE_API_URL` to your production API URL before building.

## Architecture

```text
client/
  React/Vite/Tailwind/PWA
        |
        | REST + JWT
        v
server/
  Express API
        |
        v
MySQL
```

The QR code contains an opaque event registration token. Sensitive participant data is never embedded directly in the QR code.
