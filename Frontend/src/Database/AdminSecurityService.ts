// 1. First, let's create a Firebase structure to store admin security settings
// adminSecurityService.ts

import { db } from './FirebaseConfig';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Interface for admin security settings
interface AdminSecuritySettings {
  adminEmails: string[];
  secretCode: string;
  lastUpdated: Date;
  updatedBy: string;
}

// Collection and document references
const SECURITY_COLLECTION = 'adminSecurity';
const SETTINGS_DOC = 'settings';

// Get admin security settings
export const getAdminSecuritySettings = async (): Promise<AdminSecuritySettings> => {
  const settingsRef = doc(db, SECURITY_COLLECTION, SETTINGS_DOC);
  const settingsSnap = await getDoc(settingsRef);
  
  if (settingsSnap.exists()) {
    return settingsSnap.data() as AdminSecuritySettings;
  } else {
    // Initialize with default settings if none exist
    const defaultSettings: AdminSecuritySettings = {
      adminEmails: ['parth.kulkarni@mitaoe.ac.in'],
      secretCode: 'shripad2025',
      lastUpdated: new Date(),
      updatedBy: 'system'
    };
    
    await setDoc(settingsRef, defaultSettings);
    return defaultSettings;
  }
};

// Update the secret code
export const updateSecretCode = async (newCode: string, updatedBy: string): Promise<void> => {
  const settingsRef = doc(db, SECURITY_COLLECTION, SETTINGS_DOC);
  
  await updateDoc(settingsRef, {
    secretCode: newCode,
    lastUpdated: new Date(),
    updatedBy
  });
};

// Add a new admin email
export const addAdminEmail = async (email: string, updatedBy: string): Promise<void> => {
  const settingsRef = doc(db, SECURITY_COLLECTION, SETTINGS_DOC);
  
  await updateDoc(settingsRef, {
    adminEmails: arrayUnion(email.toLowerCase()),
    lastUpdated: new Date(),
    updatedBy
  });
};

// Remove an admin email
export const removeAdminEmail = async (email: string, updatedBy: string): Promise<void> => {
  const settingsRef = doc(db, SECURITY_COLLECTION, SETTINGS_DOC);
  
  await updateDoc(settingsRef, {
    adminEmails: arrayRemove(email.toLowerCase()),
    lastUpdated: new Date(),
    updatedBy
  });
};

// Check if an email is an admin
export const isAdminUser = async (email: string | null): Promise<boolean> => {
  if (!email) return false;
  
  const settings = await getAdminSecuritySettings();
  return settings.adminEmails.includes(email.toLowerCase());
};

// Verify admin secret code
export const isValidSecretCode = async (code: string): Promise<boolean> => {
  const settings = await getAdminSecuritySettings();
  return code === settings.secretCode;
};