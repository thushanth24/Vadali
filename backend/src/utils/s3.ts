import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const region = process.env.AWS_REGION || 'us-east-1';

const sessionToken = process.env.AWS_SESSION_TOKEN || process.env.AWS_SECURITY_TOKEN;

const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(sessionToken ? { sessionToken } : {}),
      }
    : undefined;

const s3Client = new S3Client({
  region,
  ...(credentials ? { credentials } : {}),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

interface UploadFileParams {
  file: Buffer;
  fileName: string;
  contentType: string;
}

export const generateUploadUrl = async (fileName: string, contentType: string) => {
  const fileKey = `${uuidv4()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 }); // URL expires in 5 minutes
  
  return {
    uploadUrl: url,
    fileKey,
    fileUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`
  };
};

export const getFileUrl = (fileKey: string) => {
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
};
