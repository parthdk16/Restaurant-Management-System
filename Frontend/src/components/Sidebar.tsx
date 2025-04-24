import { FC } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CircleUser,
  Home,
  FileInput,
  Soup,
  ListOrdered,
  BadgeIndianRupee,
  LockKeyhole,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from '@/assets/logoLandscape.png'; 

interface SidebarProps {
    activePage: string;
    user: {
      displayName: string | null;
      photoURL: string | null;
    } | null;
  }

export const Sidebar: FC<SidebarProps> = ({ activePage, user }) => {
  return (
    <div className="hidden border-r bg-muted/40 md:block w-[230px]">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            {/* <Package2 className="h-6 w-6" />
            <span className="">Hotel Shripad</span> */}
            <img src={logo} alt="Logo" className="h-12 w-auto" />
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1">
        <nav className="flex-1 grid items-start px-2 text-sm font-medium lg:px-4">
        <Link
          to="/dashboard"
          className={`mt-4 flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "dashboard" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          to="/tables"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "tables" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <FileInput className="h-4 w-4" />
          Table Manager
        </Link>
        <Link
          to="/manage-menu"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "manage-menu" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <Soup className="h-4 w-4" />
          Menu Manager
        </Link>
        <Link
          to="/orders"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "order-manager" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <ListOrdered className="h-4 w-4" />
          Order Manager
        </Link>
        <Link
          to="/history"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "transaction-history" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <BadgeIndianRupee className="h-4 w-4" />
          Transactions
        </Link>
        <Link
          to="/manage-inventory"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "inventory" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <History className="h-4 w-4" />
          Inventory Manager
        </Link>
        <Link
          to="/security"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "security" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <LockKeyhole className="h-4 w-4" />
          Security
        </Link>
        {/* <Link
          to="/onboard"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${activePage === "onboard" ? "bg-muted text-primary" : "text-muted-foreground"}`}
        >
          <UserCheck className="h-4 w-4" />
          Analytics
        </Link> */}
      </nav>
        </div>
        <div className="mt-auto pl-0 p-2">
          <a href="/profile" className="flex items-center px-4 mb-2 mx-2 ml-5 h:text-blue">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="User Avatar"
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <CircleUser className="h-10 w-10" />
            )}
            <div className="ml-3 block text-sm font-semibold text-gray-800 group-hover:text-blue-600 dark:text-neutral-200 dark:group-hover:text-blue-600 dark:group-focus-hover:text-blue-600">
              {user?.displayName || "My Account"}
              <span className="block text-xs text-gray-700 dark:text-neutral-500">Edit Profile</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};