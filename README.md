# Link Hub - Smart Link Management Platform

A modern link hub platform with Firebase authentication, smart link ranking, and time-based visibility controls.

## Features

- Firebase Authentication (Email/Password)
- Smart link ranking based on clicks and priority scores
- Time-based link visibility (show links only during specific hours)
- Device targeting (Mobile/Desktop/All)
- Real-time analytics tracking
- Customizable hub themes
- PostgreSQL database with Neon/Railway support

## Tech Stack

**Frontend:**
- React + Vite
- React Router for navigation
- Tailwind CSS for styling
- Firebase Client SDK for authentication

**Backend:**
- Node.js + Express
- PostgreSQL (Neon/Railway)
- Firebase Admin SDK for token verification
- JWT-based authentication

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database (Neon, Railway, or local)
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd random
```

2. Install dependencies:
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

3. Set up environment variables (see Configuration section below)

4. Start the development server:
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3000
- Frontend dev server on http://localhost:5173

## Configuration

### Backend Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Neon, Railway, or local PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Firebase Admin SDK (single-line JSON)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}
```

**Getting Firebase Service Account:**
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Convert to single line and add to .env

### Frontend Environment Variables

Create a `client/.env` file:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

**Getting Firebase Client Config:**
1. Go to Firebase Console > Project Settings > General
2. Scroll to "Your apps" section
3. Click Web icon to create web app (if not exists)
4. Copy the config values

## Database Setup

### Option 1: Neon (Recommended - Free Tier)

1. Visit https://console.neon.tech/
2. Create new project
3. Copy connection string
4. Add to .env as DATABASE_URL

### Option 2: Railway

1. Visit https://railway.app/
2. Create PostgreSQL database
3. Copy connection string
4. Add to .env as DATABASE_URL

### Option 3: Local PostgreSQL

```bash
# Install PostgreSQL, then:
psql -U postgres
CREATE DATABASE linkhub;
```

Update .env:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkhub
```

### Database Migration

The app automatically creates tables on first run. If you encounter the "uid column missing" error, run:

```bash
node fix-database.js
```

## Project Structure

```
random/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── utils/         # Utility functions
│   └── dist/              # Production build (gitignored)
├── middleware/            # Express middleware
│   └── auth.js           # JWT verification
├── db.js                 # Database connection
├── server.js             # Express API server
├── firebaseAdmin.js      # Firebase Admin SDK setup
└── fix-database.js       # Database migration script
```

## API Endpoints

### Authentication Required

**POST /api/hubs**
Create a new hub
```json
{
  "handle": "mylinks",
  "title": "My Links",
  "description": "My link collection",
  "themeConfig": {}
}
```

**GET /api/hubs**
List all hubs for current user

**POST /api/links**
Add link to hub
```json
{
  "hubId": 1,
  "title": "My Link",
  "url": "https://example.com",
  "startHour": 9,
  "endHour": 17,
  "timePriority": 10,
  "deviceTarget": "all"
}
```

**DELETE /api/links/:id**
Delete a link

**GET /api/analytics/:hubId**
Get analytics for a hub

### Public Endpoints

**GET /api/hubs/:handle**
Get public hub with filtered & ranked links

**GET /go/:id**
Redirect to link URL (tracks click)

## Smart Link Features

### Link Ranking Algorithm

Links are ranked by: `score = clicks + timePriority`

- Higher scores appear first
- Automatically tracks clicks
- Manual priority boost available

### Time-Based Visibility

Set `startHour` and `endHour` (0-23) to show links only during specific hours:
- Example: `startHour=9, endHour=17` (9 AM - 5 PM only)

### Device Targeting

Choose target device:
- `all` - Show on all devices
- `mobile` - Show only on mobile
- `desktop` - Show only on desktop

## Development

### Running Backend Only

```bash
node server.js
```

### Running Frontend Only

```bash
cd client
npm run dev
```

### Building for Production

```bash
cd client
npm run build
cd ..
node server.js
```

The backend serves the React build from `client/dist/`.

## Testing

### Test Database Connection

```bash
node test-db.js
```

### Test Environment Variables

```bash
node check-env.js
```

### Verify Firebase Setup

Check server logs for:
- "Firebase Admin Initialized Successfully"
- "Connected to Neon (PostgreSQL) database"

## Troubleshooting

### "Firebase Admin not initialized"
- Check FIREBASE_SERVICE_ACCOUNT in .env
- Ensure JSON is single-line format
- Restart server after .env changes

### "Column uid does not exist"
- Run: `node fix-database.js`
- This adds the missing uid column to hubs table

### "ETIMEDOUT" database error
- Database instance may be paused or deleted
- Create new Neon/Railway database
- Update DATABASE_URL in .env

### Black screen after login
- Check browser console for errors
- Verify all VITE_* variables in client/.env
- Ensure backend is running on port 3000

## Security

- Never commit .env files
- Keep FIREBASE_SERVICE_ACCOUNT secret
- VITE_* variables are public (client-side)
- Always verify tokens on backend
- Use Firebase Security Rules for additional protection

## License

MIT

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review Firebase Console for auth issues
3. Check database connection with test-db.js
