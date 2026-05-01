import { config } from '../config';
import fs from 'fs';
import path from 'path';

/**
 * Uploads a file to local storage.
 * @param file The file to upload
 * @param folder The subfolder within the uploads directory
 * @returns The relative URL to the uploaded file
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  // Ensure the specific subfolder exists
  const subfolderPath = path.join(config.uploadsDir, folder);
  if (!fs.existsSync(subfolderPath)) {
    fs.mkdirSync(subfolderPath, { recursive: true });
  }

  // Generate unique filename
  const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
  const filePath = path.join(subfolderPath, filename);

  // Write file buffer to local storage
  fs.writeFileSync(filePath, file.buffer);

  // Return the relative URL (including the subfolder)
  return `/uploads/${folder}/${filename}`;
};

/**
 * Deletes a file from local storage.
 * @param fileUrl The relative URL of the file to delete
 */
export const deleteFromCloudinary = async (fileUrl: string): Promise<void> => {
  if (!fileUrl || !fileUrl.includes('/uploads/')) return;

  // Extract the path after /uploads/
  const relativePath = fileUrl.split('/uploads/')[1];
  const filePath = path.join(config.uploadsDir, relativePath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default { uploadToCloudinary, deleteFromCloudinary };
