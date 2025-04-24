import { FC, useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Swal from 'sweetalert2';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/Database/FirebaseConfig";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface UserProfile {
    id?: string;
    name: string;
    phone: string;
    email: string;
    defaultAddress?: string;
    createdAt?: any;
    updatedAt?: any;
}

const ProfilePage: FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<UserProfile>({
        name: '',
        phone: '',
        email: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
          if (currentUser) {
            const userDetails: User = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
            };
            setUser(userDetails);
            
            // Initialize form data with user information from Firebase Auth
            setFormData({
              id: currentUser.uid,
              name: currentUser.displayName || '',
              phone: '', // Phone number isn't typically stored in basic Firebase Auth
              email: currentUser.email || '',
              defaultAddress: '',
              createdAt: currentUser.metadata?.creationTime || new Date().toISOString(),
            });
            
          } else {
            setUser(null);
            navigate("/admin/login");
          }
        });
    
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
      const fetchUserDoc = async () => {
        try {
           if (!user || !user.email) return;
          const usersRef = collection(db, "Users");
          const q = query(usersRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);
  
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log(userData);
            setFormData({
              name: userData.name,
              phone: userData.phone,
              email: userData.email,
              defaultAddress: userData.defaultAddress || '',
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt
            });
          } else {
            console.log("No matching user found.");
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
        }
      };
  
      fetchUserDoc();
    }, [user]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value
      });
    };
    
    const saveProfile = async () => {
        if (!formData.name || !formData.phone || !formData.email) {
          Swal.fire({
            title: "Error",
            text: "Please fill in all required fields",
            icon: "error"
          });
          return;
        }
        
        try {
          setIsSaving(true);
          
          if (user) {
            // Update displayName in Firebase Auth
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, { 
                displayName: formData.name 
              });
            }
            
            // Update or create user document in Firestore
            const userDocRef = doc(db, "Users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
              // Document exists, update it
              await updateDoc(userDocRef, {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                defaultAddress: formData.defaultAddress,
                updatedAt: serverTimestamp()
              });
            } else {
              // Document doesn't exist, create it
              await setDoc(userDocRef, {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                defaultAddress: formData.defaultAddress || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
          }
          
          setIsEditing(false);
          
          Swal.fire({
            title: "Success",
            text: "Profile updated successfully",
            icon: "success"
          });
        } catch (error) {
          console.error("Error updating profile:", error);
          Swal.fire({
            title: "Error",
            text: "Failed to update profile. Please try again.",
            icon: "error"
          });
        } finally {
          setIsSaving(false);
        }
      };
      
    
    // Show loading state if user data is not yet loaded
    if (!user) {
      return (
        <div className="max-w-2xl mx-auto p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-blue-500"></div>
        </div>
      );
    }
    
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <UserIcon className="size-6" />
              My Profile
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Your full name" 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="10-digit phone number" 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    placeholder="your@email.com" 
                    required 
                    disabled
                  />
                </div>
                
                <div>
                  <Label htmlFor="defaultAddress">Default Delivery Address</Label>
                  <Textarea 
                    id="defaultAddress" 
                    name="defaultAddress" 
                    value={formData.defaultAddress || ''} 
                    onChange={handleChange} 
                    placeholder="Your default delivery address" 
                    rows={3} 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center border-b pb-2">
                  <span className="font-medium w-36 text-gray-600">Full Name:</span>
                  <span className="text-black">{formData.name || user.displayName || 'Not set'}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center border-b pb-2">
                  <span className="font-medium w-36 text-gray-600">Phone Number:</span>
                  <span className="text-black">{formData.phone || 'Not set'}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center border-b pb-2">
                  <span className="font-medium w-36 text-gray-600">Email Address:</span>
                  <span className="text-black">{formData.email || user.email || 'Not set'}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row border-b pb-2">
                  <span className="font-medium w-36 text-gray-600">Default Address:</span>
                  <span className="text-black">{formData.defaultAddress || 'Not set'}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center pt-2">
                  <span className="font-medium w-36 text-gray-600">Member Since:</span>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-end">
            {isEditing ? (
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Reset form data to current user values
                    setFormData({
                      id: user.uid,
                      name: user.displayName || '',
                      phone: formData.phone,
                      email: user.email || '',
                      defaultAddress: formData.defaultAddress,
                      createdAt: user.metadata?.creationTime || new Date()
                    });
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
};

export default ProfilePage;