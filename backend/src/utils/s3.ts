import AWS from 'aws-sdk';
import { config } from '../config';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: config.aws.bucketName!,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();
  return result.Location;
};

export const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  const key = fileUrl.split('.com/')[1];
  
  const params = {
    Bucket: config.aws.bucketName!,
    Key: key,
  };

  await s3.deleteObject(params).promise();
};

export default { uploadToS3, deleteFromS3 };
