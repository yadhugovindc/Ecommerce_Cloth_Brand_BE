import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Cloudinary configured:', {
  cloudName,
  apiKeyLoaded: Boolean(apiKey),
  apiSecretLoaded: Boolean(apiSecret),
});

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    'Missing Cloudinary configuration. Create backend/.env with CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export function uploadImage(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'atelier/products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          const cloudinaryError = error as { message?: string; http_code?: number };
          reject(
            new Error(
              `Cloudinary upload failed (${cloudinaryError.http_code || 'unknown'}): ${cloudinaryError.message || 'Unknown Cloudinary error'}`
            )
          );
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}