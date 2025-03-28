import { FC, ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../Database/FirebaseConfig'; // Firebase config
import { onAuthStateChanged } from 'firebase/auth';

// Loader Spinner component (simple CSS spinner)
const Loader: FC = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-600"></div>
  </div>
);

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserAuthenticated(true);
      } else {
        setUserAuthenticated(false);
        navigate('/login'); // Redirect to login if not authenticated
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return <Loader />; // Show loader while checking authentication
  }

  return <>{userAuthenticated ? children : null}</>;
};

export default ProtectedRoute;
