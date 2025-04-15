import { uploadFile } from './fileUpload';
import { saveFileUrlToMenuCollection } from './saveURL';

export const handleFileUpload = async (file: Buffer, fileName: string) => {
  try {
    const fileUrl = await uploadFile(file, fileName);
    await saveFileUrlToMenuCollection(fileUrl, fileName);
    console.log('File uploaded and URL saved to Firestore:', fileUrl);
  } catch (error) {
    console.error('Error in file upload process:', error);
  }
};