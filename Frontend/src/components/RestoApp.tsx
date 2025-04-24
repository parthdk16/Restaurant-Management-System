import { FC, useState } from "react";
import { User, ClipboardList, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from '@/assets/logoLandscape.png';
import { FoodOrderingPage } from "./FoodOrderPage";
import ProfilePage from "./CustomerProfile";
import { OrdersPage } from "./MyOrders";

interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

// Main App Component with Routing
export const RestaurantApp: FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'profile' | 'orders'>('home');;
  const [isLoading, setIsLoading] = useState(true);
  
  // Render the page based on the current page state
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <FoodOrderingPage />;
      case 'profile':
        return <ProfilePage />;
      case 'orders':
        return <OrdersPage userId={userId} />;
      default:
        return <FoodOrderingPage />;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="Hotel Shripad Logo" className="h-10" />
              <h2 className="text-xl font-bold text-teal-700 hidden md:block">Hotel Shripad</h2>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant={currentPage === 'home' ? 'default' : 'ghost'} 
                className="flex items-center gap-2"
                onClick={() => setCurrentPage('home')}
              >
                <Home className="size-4" />
                <span className="hidden md:inline">Home</span>
              </Button>
              
              <Button 
                variant={currentPage === 'orders' ? 'default' : 'ghost'} 
                className="flex items-center gap-2"
                onClick={() => setCurrentPage('orders')}
              >
                <ClipboardList className="size-4" />
                <span className="hidden md:inline">My Orders</span>
              </Button>
              
              <Button 
                variant={currentPage === 'profile' ? 'default' : 'ghost'} 
                className="flex items-center gap-2"
                onClick={() => setCurrentPage('profile')}
              >
                <User className="size-4" />
                <span className="hidden md:inline">Profile</span>
              </Button>
              
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 text-red-500"
              >
                <LogOut className="size-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
};