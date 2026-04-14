import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  // Check if Cloudinary is configured
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    console.warn('⚠️ Cloudinary is not configured. Saving file locally.');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadsDir, filename);

    // Write file buffer to local storage
    fs.writeFileSync(filePath, file.buffer);

    // Return the local URL
    return `http://localhost:${config.port}/uploads/${filename}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `sumaya-madrasa/${folder}`,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );

    uploadStream.end(file.buffer);
  });
};

export const deleteFromCloudinary = async (fileUrl: string): Promise<void> => {
  // If it's a local URL, delete the local file
  if (fileUrl.includes('/uploads/')) {
    const filename = fileUrl.split('/uploads/')[1];
    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  if (!config.cloudinary.apiKey) return;

  // Extract public ID from Cloudinary URL
  // Format: .../upload/v12345/folder/subfolder/file.ext
  const parts = fileUrl.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return;

  // Join everything after 'upload/vXXXX/' or just 'upload/'
  const publicIdWithExt = parts[uploadIndex + 1].startsWith('v') 
    ? parts.slice(uploadIndex + 2).join('/') 
    : parts.slice(uploadIndex + 1).join('/');
  
  const publicId = publicIdWithExt.split('.')[0];
  await cloudinary.uploader.destroy(publicId);
};

export default { uploadToCloudinary, deleteFromCloudinary };
