import { db } from './FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Checks if an email belongs to an authorized delivery person
 * @param email - Email address to check
 * @returns Promise<boolean> - True if the email belongs to a delivery person
 */
export const isDeliveryPerson = async (email: string | null): Promise<boolean> => {
  if (!email) return false;
  
  try {
    // Query the delivery staff collection to check if this email exists
    const deliveryStaffRef = collection(db, 'deliveryStaff');
    const q = query(deliveryStaffRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking delivery staff status:", error);
    return false;
  }
};

/**
 * Gets delivery person details by email
 * @param email - Email address of the delivery person
 * @returns Promise with delivery person details or null
 */
export const getDeliveryPersonDetails = async (email: string | null) => {
  if (!email) return null;
  
  try {
    const deliveryStaffRef = collection(db, 'deliveryStaff');
    const q = query(deliveryStaffRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    const staffDoc = querySnapshot.docs[0];
    return {
      id: staffDoc.id,
      ...staffDoc.data()
    };
  } catch (error) {
    console.error("Error getting delivery staff details:", error);
    return null;
  }
};