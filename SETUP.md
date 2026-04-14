<!-- 

I used reference name as Samaiya Madrasa just for an example change it into apropriate one 

-->

# Development Setup Guide

## Prerequisites

Before you begin, ensure you have installed:
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL 14+** - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd EduManage-System
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env file with your settings
# Update DATABASE_URL with your PostgreSQL connection string
```

#### Example .env configuration:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sumaya_madrasa"
DATABASE_URL="postgresql://eduadmin1:eduadmin1@localhost:5432/edumanage_system"

JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

#### Generate Prisma Client and Run Migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed initial data (creates Super Admin and sample data)
npm run seed
```

#### Start Backend Development Server:

```bash
npm run dev
```

Backend will be running at `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env
```

#### Frontend .env:

```env
VITE_API_URL=http://localhost:5000/api
```

#### Start Frontend Development Server:

```bash
npm run dev
```

Frontend will be running at `http://localhost:5173`

## Testing the Application

1. Open browser and go to `http://localhost:5173`
2. Login with default credentials:
   - **Username:** `superadmin`
   - **Password:** `Admin@123`
3. **IMPORTANT:** Change the default password immediately!

## Database Management

### View Database in Prisma Studio

```bash
cd backend
npx prisma studio
```

Opens at `http://localhost:5555` - a GUI for your database

### Reset Database (⚠️ Deletes all data)

```bash
cd backend
npx prisma migrate reset
```

### Create New Migration

After changing `schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

## Development Workflow

### Backend Development

```bash
cd backend
npm run dev  # Auto-restarts on file changes
```

#### File Structure:
- `src/controllers/` - Request handlers
- `src/routes/` - API routes
- `src/middleware/` - Auth, validation
- `src/services/` - Business logic
- `src/utils/` - Helper functions
- `prisma/schema.prisma` - Database schema

### Frontend Development

```bash
cd frontend
npm run dev
```

#### File Structure:
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/services/` - API calls
- `src/context/` - React Context (Auth, etc.)
- `src/types/` - TypeScript types
- `src/utils/` - Helper functions

## Common Commands

### Backend

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run seed         # Seed database
npx prisma studio    # Open database GUI
npx prisma migrate dev    # Run migrations
```

### Frontend

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## API Testing

### Using VS Code REST Client

Install "REST Client" extension, then create `test.http`:

```http
### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "Admin@123"
}

### Get Dashboard Stats (replace TOKEN)
GET http://localhost:5000/api/dashboard/stats
Authorization: Bearer YOUR_TOKEN_HERE
```

### Using Postman

1. Import the API collection (if provided)
2. Set base URL: `http://localhost:5000/api`
3. For protected routes, add header:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN`

## Troubleshooting

### Port Already in Use

**Backend (5000):**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

**Frontend (5173):**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error

1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Verify database exists:
   ```bash
   psql -U postgres
   CREATE DATABASE sumaya_madrasa;
   ```

### Prisma Client Errors

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### Node Modules Issues

```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL.

## VS Code Extensions (Recommended)

- **Prisma** - Syntax highlighting for Prisma schema
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Prettier**
- **REST Client**

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## Environment Variables

### Backend Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT (min 32 chars)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - development/production

### Backend Optional (for file uploads):
- AWS S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, `AWS_REGION`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Frontend Required:
- `VITE_API_URL` - Backend API URL

## Testing Accounts

After seeding, you have:
- **Super Admin:** `superadmin` / `Admin@123`

Create test accounts for other roles via User Management page.

## Next Steps

1. ✅ Set up development environment
2. ✅ Start backend and frontend servers
3. ✅ Login and explore the application
4. ✅ Create test users for different roles
5. ✅ Add sample students and teachers
6. ✅ Test key features
7. ✅ Begin development

## Need Help?

- Check the [README.md](README.md) for feature overview
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Review API documentation in README
- Check Prisma schema for database structure

Happy coding! 🚀
