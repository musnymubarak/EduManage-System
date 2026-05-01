import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
  },
  
  // AWS S3 Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION || 'us-east-1',
  },
  
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  
  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  // Uploads
  uploadsDir: process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'),
};

export default config;
