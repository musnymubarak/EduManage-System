# Sumaya Madrasa Management System

A comprehensive production-grade management system for Sumaya Madrasa with student registration, attendance tracking, fee management, inventory control, and more.

## 🚀 Features

### User Roles
- **Super Admin** - Complete system access, user account creation
- **Principal** - Administrative oversight, todo management
- **Vice Principal** - Administrative support, todo management
- **Receptionist** - Student/teacher registration, attendance, inventory, schedules
- **Expenditure Receptionist** - Daily expenditure tracking

### Core Modules
1. **Student Management** - Registration, profiles, guardian information, document attachments
2. **Teacher Management** - Registration, qualifications, class assignments
3. **Attendance System** - Daily attendance for students and teachers
4. **Class Management** - Classes: 9A, 9B, 10A, 10B, 11A, 11B, 12, 13, 14 (scalable)
5. **Fee Management** - Monthly fees, partial payments, payment tracking
6. **Exam Management** - Term exams, fees, marks entry, report generation
7. **Inventory Management** - Track tables, chairs, markers, and other items
8. **Donations** - Donation tracking and reporting
9. **Expenditure Tracking** - Daily expenditure entry and reports
10. **Todo Dashboard** - Issue notifications, task management with history
11. **Dashboard** - Real-time statistics and summaries

## 🛠️ Tech Stack

### Frontend
- React.js 18 with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Router for navigation
- React Query for state management
- Axios for API calls

### Backend
- Node.js with Express.js
- TypeScript
- Prisma ORM
- JWT Authentication
- Role-Based Access Control (RBAC)
- Bcrypt for password hashing

### Database
- PostgreSQL

### File Storage
- AWS S3 / Cloudinary (for documents and attachments)

### Deployment
- Frontend: Vercel / Netlify
- Backend: Render / Railway / AWS
- Database: Supabase / Neon / AWS RDS

## 📁 Project Structure

```
EduManage-System/
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Helper functions
│   │   └── index.ts      # Entry point
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── package.json
│
└── frontend/             # React.js application
    ├── src/
    │   ├── components/   # Reusable components
    │   ├── pages/        # Page components
    │   ├── hooks/        # Custom hooks
    │   ├── services/     # API services
    │   ├── utils/        # Helper functions
    │   ├── types/        # TypeScript types
    │   ├── context/      # React context
    │   └── App.tsx       # Main component
    └── package.json
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sumaya_madrasa"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_BUCKET_NAME="your-bucket-name"
AWS_REGION="us-east-1"
```

Run migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

Seed initial data (creates Super Admin):
```bash
npm run seed
```

Start development server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

Start development server:
```bash
npm run dev
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/change-password` - Change password

### Users (Super Admin only)
- `POST /api/users` - Create user account
- `GET /api/users` - List all users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Students
- `POST /api/students` - Register student
- `GET /api/students` - List students
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student
- `POST /api/students/:id/upload` - Upload documents

### Teachers
- `POST /api/teachers` - Register teacher
- `GET /api/teachers` - List teachers
- `GET /api/teachers/:id` - Get teacher details
- `PUT /api/teachers/:id` - Update teacher

### Attendance
- `POST /api/attendance/students` - Mark student attendance
- `POST /api/attendance/teachers` - Mark teacher attendance
- `GET /api/attendance/students/:date` - Get daily student attendance
- `GET /api/attendance/report` - Generate attendance report

### Fees
- `POST /api/fees/payment` - Record fee payment
- `GET /api/fees/student/:id` - Get student fee history
- `GET /api/fees/pending` - List pending payments
- `GET /api/fees/report` - Generate fee report

### Exams
- `POST /api/exams` - Create exam
- `POST /api/exams/:id/marks` - Enter marks
- `GET /api/exams/:id/report` - Generate report sheet

### Inventory
- `POST /api/inventory` - Add inventory item
- `GET /api/inventory` - List items
- `PUT /api/inventory/:id` - Update item
- `GET /api/inventory/low-stock` - Low stock items

### Donations
- `POST /api/donations` - Record donation
- `GET /api/donations` - List donations
- `GET /api/donations/report` - Generate report

### Expenditures
- `POST /api/expenditures` - Record expenditure
- `GET /api/expenditures` - List expenditures
- `GET /api/expenditures/report` - Generate report

### Todo/Issues
- `POST /api/todos` - Create todo/issue
- `GET /api/todos` - List todos
- `PUT /api/todos/:id` - Update todo status
- `GET /api/todos/history` - View history

## 🔐 Default Credentials

After seeding:
- **Username:** superadmin
- **Password:** Admin@123

**⚠️ Change this password immediately in production!**

## 📦 Deployment

### Backend Deployment (Render/Railway)
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

### Frontend Deployment (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Database (Supabase/Neon)
1. Create PostgreSQL database
2. Update DATABASE_URL in backend .env
3. Run migrations

## 🤝 Contributing

This is a private project for Sumaya Madrasa.

## 📄 License

Proprietary - All rights reserved

## 👨‍💻 Developer

Developed for Sumaya Madrasa
