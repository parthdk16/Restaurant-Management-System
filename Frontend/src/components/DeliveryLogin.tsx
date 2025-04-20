import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { auth } from '../Database/FirebaseConfig';  
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react'; 
import authSideImage from "../assets/image.png";
import logo from "../assets/HotelShripad.png";
import { isDeliveryPerson } from '@/Database/DeliverySecurityService'; // You'll need to create this service

export const DeliverySignIn: FC = () => { 
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isDelivery = await isDeliveryPerson(user.email);
        if (isDelivery) {
          navigate('/delivery/dashboard');
        } else {
          // Sign out non-delivery users who somehow got authenticated
          auth.signOut();
          setError('Access denied. Delivery staff privileges required.');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const storedEmail = localStorage.getItem('deliveryEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  // Handle sign in with email and password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if the authenticated user is a delivery person
      const isDelivery = await isDeliveryPerson(userCredential.user.email);
      if (!isDelivery) {
        await auth.signOut();
        setError('Access denied. Delivery staff privileges required.');
        setIsLoading(false);
        return;
      }
      
      console.log("Delivery staff sign in successful");
      navigate('/delivery/dashboard');
    } catch (error) {
      console.error(error);
      setError('Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email input and save it to localStorage
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    localStorage.setItem('deliveryEmail', e.target.value);
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if the Google account is an authorized delivery person
      const isDelivery = await isDeliveryPerson(result.user.email);
      if (isDelivery) {
        console.log("Google delivery staff sign-in successful");
        navigate('/delivery/dashboard');
      } else {
        // Sign out if not a delivery person
        await auth.signOut();
        setError('Access denied. This Google account is not authorized for delivery access.');
      }
    } catch (error) {
      console.error(error);
      setError('Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid h-screen lg:grid-cols-2 overflow-hidden">
      {/* Image Section */}
      <div className="hidden bg-muted lg:block h-full">
        <img
          src={authSideImage}
          alt="Image"
          className="h-screen w-auto object-cover brightness-[0.8]"
        />
        <img src={logo} alt="Logo" className="absolute left-10 top-10 h-28 w-auto" />
      </div>
      {/* Form Section */}
      <div className="flex items-center justify-center h-screen">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Hotel Shripad</h1>
            <h1 className="text-3xl font-bold">Delivery Staff Portal</h1>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <p className="text-muted-foreground">
              Delivery staff access only
            </p>
          </div>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Delivery Staff Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="delivery@hotelshripad.com"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="/forgot-password"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"} 
                  placeholder="**********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  disabled={isLoading}
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" variant="outline" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Delivery Login"}
            </Button>
            <div className="flex items-center">
              <hr className="flex-grow border-t border-gray-300" />
              <h5 className="mx-4 text-gray-500 text-sm">OR CONTINUE WITH</h5>
              <hr className="flex-grow border-t border-gray-300" />
            </div>
            <Button 
              onClick={handleGoogleSignIn} 
              variant="outline" 
              className="w-full"
              disabled={isLoading}
              type="button"
            >
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"></path>
              </svg>
              Google Delivery Login
            </Button>
            <p className="text-xs text-gray-500 text-center">
              This area is for delivery staff only. Contact management if you're having trouble accessing your account.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};