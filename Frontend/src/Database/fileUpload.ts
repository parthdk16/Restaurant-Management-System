import {s3} from './AWSConfig';

export const uploadFile = async (file: Buffer, fileName: string): Promise<string> => {
  const params = {
    Bucket: 'hotel-shripad',
    Key: fileName,
    Body: file,
    ContentType: 'application/octet-stream',
  };

  try {
    const data = await s3.upload(params).promise();
    return data.Location;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
};