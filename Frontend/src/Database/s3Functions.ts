import { s3 } from '../Database/AWSConfig';

interface CustomFile {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
  }
  
  export const uploadFileToS3 = async (file: CustomFile): Promise<string> => {
    const params = {
      Bucket: process.env.S3_BUCKET || (() => { throw new Error("S3_BUCKET environment variable is not defined"); })(),
      Key: `uploads/${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };
  
    try {
      const data = await s3.upload(params).promise();
      return data.Location; // Return the URL of the uploaded file
    } catch (error) {
      console.error("Error uploading file to S3: ", error);
      throw new Error("File upload failed");
    }
  };