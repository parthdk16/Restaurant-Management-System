import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { auth } from '../Database/FirebaseConfig';  
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider , onAuthStateChanged } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react'; 
import authSideImage from "../assets/image.png";
import logo from "../assets/HotelShripad.png";
// import Swal from 'sweetalert2';
// import { useTheme } from './theme-provider';

export const CustomerLogin: FC = () => { 
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // const { theme } = useTheme();

  // const sweetAlertOptions: Record<string, unknown> = {
  //   background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff', 
  //   color: theme === "dark" ? '#fff' : '#000', 
  //   confirmButtonText: 'OK', 
  //   confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9', 
  //   cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545', 
  // };
  
   
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/food-order');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

 
  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  // Handle sign in with email and password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Sign in successful");
      // Swal.fire({
      //   ...sweetAlertOptions,
      //   icon: 'success',
      //   title: 'Sign in successful',
      //   showConfirmButton: false,
      //   timer: 1500
      // });
      navigate('/food-order');
    } catch (error) {
      setError('Invalid email or password.');
      console.error("Sign in error:", error);
      // Swal.fire({
      //   ...sweetAlertOptions,
      //   icon: 'error',
      //   title: 'Oops...',
      //   text: 'Invalid email or password.',
      // });
    }
  };

  // Handle email input and save it to localStorage
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    localStorage.setItem('email', e.target.value); // Store email in localStorage
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log("Google sign-in successful");
      // Swal.fire({
      //   ...sweetAlertOptions,
      //   icon: 'success',
      //   title: 'Google sign-in successful',
      //   showConfirmButton: false,
      //   timer: 1500
      // });
      navigate('/food-order');
    } catch (error) {
      setError('Failed to sign in with Google.');
      console.error("Google sign-in error:", error);
      // Swal.fire({
      //   ...sweetAlertOptions,
      //   icon: 'error',
      //   title: 'Oops...',
      //   text: 'Failed to sign in with Google.',
      // });
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
            <h1 className="text-3xl font-bold">Login</h1>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <p className="text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jhon@youremail.in"
                value={email}
                onChange={handleEmailChange}
                required
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
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" variant="outline">
              Login
            </Button>
            <div className="flex items-center">
              <hr className="flex-grow border-t border-gray-300" />
              <h5 className="mx-4 text-gray-500 text-sm">OR CONTINUE WITH</h5>
              <hr className="flex-grow border-t border-gray-300" />
            </div>
            <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"></path>
              </svg>
              Google
            </Button>
            <p className="text-xs text-gray-500 text-center">
              By clicking continue, you agree to our{' '}
              <a href="#" className="text-gray-500 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-gray-500 underline">
                Privacy Policy
              </a>.
            </p>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <br />
            <div onClick={() => navigate('/signup')} className=" cursor-pointer ">
              Sign up here!!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};