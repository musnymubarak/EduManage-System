import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

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
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `buhary-madrasa/${folder}`,
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
  const publicId = fileUrl.split('/').slice(-2).join('/').split('.')[0];
  await cloudinary.uploader.destroy(publicId);
};

export default { uploadToCloudinary, deleteFromCloudinary };
