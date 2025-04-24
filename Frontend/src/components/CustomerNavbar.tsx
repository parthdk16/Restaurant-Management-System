import { FC, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Home, 
  User, 
  ClipboardList, 
  LogOut, 
  Menu, 
  Heart,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/AuthProvider";
import logo from '@/assets/logoLandscape.png';
import { auth } from "@/Database/FirebaseConfig";
import { signOut } from "firebase/auth";

interface NavbarProps {
  cartItemCount: number;
  onCartClick: () => void;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const Navbar: FC<NavbarProps> = ({ cartItemCount, onCartClick }) => {
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
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
        } else {
          setUser(null);
        }
      });
  
      return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        navigate("/login");
      };

  const navItems = [
    { name: "Home", icon: <Home className="mr-2 size-4" />, path: "/" },
    { name: "My Orders", icon: <ClipboardList className="mr-2 size-4" />, path: "/orders-user" },
    { name: "Favorites", icon: <Heart className="mr-2 size-4" />, path: "/favorites" },
    { name: "Profile", icon: <User className="mr-2 size-4" />, path: "/profile-user" },
  ];

  const userInitials = user?.displayName 
    ? user.displayName.split(' ').map(name => name[0]).join('').toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="logo" className="h-8 w-auto" />
          </Link>
        </div>
        
        {/* Mobile Nav */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <div className="flex items-center mb-6">
              <Link to="/" className="flex items-center space-x-2">
                <img src={logo} alt="logo" className="h-8 w-auto" />
              </Link>
            </div>
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link 
                  key={item.name}
                  to={item.path}
                  className="flex items-center px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent"
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              <Button 
                variant="ghost" 
                className="justify-start px-2" 
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Logout
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        
        {/* Desktop Nav */}
        <div className="flex-1 flex items-center justify-between">
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {navItems.map((item) => (
              <Link 
                key={item.name}
                to={item.path}
                className="flex items-center text-sm font-medium transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={onCartClick}
            >
              <ShoppingBag className="size-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center size-5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  {cartItemCount}
                </span>
              )}
              <span className="sr-only">Open cart</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="size-8">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile-user" className="cursor-pointer">
                    <User className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders-user" className="cursor-pointer">
                    <ClipboardList className="mr-2 size-4" />
                    My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites" className="cursor-pointer">
                    <Heart className="mr-2 size-4" />
                    Favorites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};