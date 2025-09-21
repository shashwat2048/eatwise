import { v2 as cloudinary } from 'cloudinary'

// Support multiple common env var names
const cloudinaryUrl = process.env.CLOUDINARY_URL;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  || process.env.CLOUDINARY_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY
  || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudinaryUrl) {
  // If CLOUDINARY_URL is present (cloudinary://key:secret@cloud_name), SDK will read it from env
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export async function uploadImageBase64(base64Data: string, folder = 'eatwise') {
  if (!cloudinaryUrl && (!cloudName || !apiKey || !apiSecret)) {
    throw new Error('Cloudinary env missing. Set either CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME (+ CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET). Also supports CLOUDINARY_NAME and NEXT_PUBLIC_ variants.')
  }
  // Accept full dataURL or raw base64; coerce to dataURL
  const isDataUrl = base64Data.startsWith('data:');
  const payload = isDataUrl ? base64Data : `data:image/jpeg;base64,${base64Data}`;
  const res = await cloudinary.uploader.upload(payload, {
    folder,
    resource_type: 'image',
    overwrite: true,
  })
  return {
    publicId: res.public_id,
    secureUrl: res.secure_url,
    width: res.width,
    height: res.height,
    bytes: res.bytes,
    format: res.format,
  }
}
