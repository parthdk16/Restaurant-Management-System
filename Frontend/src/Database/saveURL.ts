import { db } from './FirebaseConfig';
import { setDoc, doc } from "firebase/firestore";

export const saveFileUrlToMenuCollection = async (fileUrl: string, documentName: string) => {
    const docRef = doc(db, 'Menu', documentName);

    await setDoc(docRef, { fileUrl: fileUrl });
};