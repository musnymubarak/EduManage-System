# Deployment Guide - Buhary Madrasa Management System

## Backend Deployment

### Option 1: Render.com (Recommended)

1. **Create Account**
   - Go to [render.com](https://render.com) and sign up

2. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Choose a name: `buhary-madrasa-db`
   - Select region closest to your users
   - Choose free or paid plan
   - Copy the "Internal Database URL" after creation

3. **Deploy Backend**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** buhary-madrasa-api
     - **Environment:** Node
     - **Build Command:** `cd backend && npm install && npx prisma generate && npm run build`
     - **Start Command:** `cd backend && npm start`
     - **Root Directory:** leave blank

4. **Environment Variables**
   Add these in Render dashboard:
   ```
   DATABASE_URL=<paste-internal-database-url>
   JWT_SECRET=<generate-random-secret>
   NODE_ENV=production
   FRONTEND_URL=<your-frontend-url>
   AWS_ACCESS_KEY_ID=<your-aws-key>
   AWS_SECRET_ACCESS_KEY=<your-aws-secret>
   AWS_BUCKET_NAME=<your-bucket>
   AWS_REGION=us-east-1
   ```

5. **Run Migrations**
   After first deployment, go to Shell tab and run:
   ```bash
   cd backend
   npx prisma migrate deploy
   npm run seed
   ```

### Option 2: Railway.app

1. **Create Account**
   - Go to [railway.app](https://railway.app)

2. **Create New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js

3. **Add PostgreSQL**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Copy the DATABASE_URL from variables

4. **Configure Build**
   - Settings → Add these:
     - **Build Command:** `cd backend && npm install && npx prisma generate && npm run build`
     - **Start Command:** `cd backend && npx prisma migrate deploy && npm start`

5. **Add Environment Variables** (same as Render)

## Frontend Deployment

### Vercel (Recommended)

1. **Create Account**
   - Go to [vercel.com](https://vercel.com) and sign up

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset:** Vite
     - **Root Directory:** frontend
     - **Build Command:** `npm run build`
     - **Output Directory:** dist

3. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

4. **Deploy**
   - Click "Deploy"
   - Your site will be live at `https://your-project.vercel.app`

### Netlify (Alternative)

1. **Create Account**
   - Go to [netlify.com](https://netlify.com)

2. **Deploy**
   - Drag and drop your `frontend/dist` folder (after building locally)
   - Or connect GitHub and configure:
     - **Base directory:** frontend
     - **Build command:** `npm run build`
     - **Publish directory:** frontend/dist

3. **Environment Variables**
   - Go to Site settings → Environment variables
   - Add `VITE_API_URL`

## Database Setup

### Supabase (Easy PostgreSQL)

1. **Create Account**
   - Go to [supabase.com](https://supabase.com)

2. **Create Project**
   - New Project → Choose name and password
   - Wait for provisioning

3. **Get Connection String**
   - Settings → Database → Connection string
   - Copy and use as `DATABASE_URL`

### Neon.tech (Alternative)

1. **Create Account**
   - Go to [neon.tech](https://neon.tech)

2. **Create Project**
   - Automatically provisions PostgreSQL
   - Copy connection string

## File Storage Setup

### AWS S3

1. **Create S3 Bucket**
   - Go to AWS Console → S3
   - Create bucket with public access for files
   - Note bucket name and region

2. **Create IAM User**
   - IAM → Users → Add user
   - Attach policy: `AmazonS3FullAccess`
   - Copy Access Key ID and Secret

### Cloudinary (Easier Alternative)

1. **Create Account**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Free tier: 25GB storage

2. **Get Credentials**
   - Dashboard → Account Details
   - Copy Cloud name, API Key, API Secret

## Post-Deployment Checklist

✅ Backend deployed and accessible
✅ Database created and migrations run
✅ Seed data created (Super Admin)
✅ Frontend deployed and accessible
✅ Frontend can connect to backend API
✅ File uploads working (S3/Cloudinary)
✅ CORS configured correctly
✅ HTTPS enabled (automatic on Vercel/Render)
✅ Change default Super Admin password

## Testing Deployment

1. **Visit Frontend URL**
2. **Login with:**
   - Username: `superadmin`
   - Password: `Admin@123`
3. **Change Password immediately**
4. **Test key features:**
   - Create a user
   - Add a student
   - Upload a document
   - Mark attendance
   - Record a payment

## Monitoring & Maintenance

### Render.com
- Automatic deployments on git push
- View logs in dashboard
- Free tier sleeps after inactivity (upgrade for always-on)

### Vercel
- Automatic deployments on git push
- Analytics available
- Free tier has generous limits

### Database Backups
- **Render:** Automatic backups on paid plan
- **Supabase:** Daily backups on free tier
- **Manual:** Use `pg_dump` periodically

## Cost Estimate (Monthly)

### Free Tier
- Frontend: Vercel (Free)
- Backend: Render (Free, sleeps after 15 min inactivity)
- Database: Supabase (Free, 500MB)
- File Storage: Cloudinary (Free, 25GB)
- **Total: $0/month**

### Production Grade
- Frontend: Vercel Pro ($20/month)
- Backend: Render Standard ($7/month, always-on)
- Database: Render PostgreSQL ($7/month, backups included)
- File Storage: AWS S3 (~$5-10/month estimated)
- **Total: ~$40-45/month**

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL is correct
- Ensure database is running
- Check IP allowlist (if applicable)

### "API calls failing"
- Check CORS settings in backend
- Verify VITE_API_URL in frontend
- Check backend logs

### "File uploads not working"
- Verify AWS/Cloudinary credentials
- Check file size limits
- Review S3 bucket permissions

## Support

For issues specific to:
- Backend API: Check backend logs
- Frontend: Check browser console
- Database: Check database logs in provider dashboard

## Updating the Application

1. **Make changes locally**
2. **Test thoroughly**
3. **Commit and push to GitHub**
4. **Auto-deployment happens on:**
   - Render (backend)
   - Vercel (frontend)
5. **Run migrations if schema changed:**
   ```bash
   # In Render shell
   npx prisma migrate deploy
   ```
