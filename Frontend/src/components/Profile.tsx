import { FC, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  CircleUser,
  Home,
  Menu,
  Package2,
  Search,
  Command,
  User,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { auth, db } from "../Database/FirebaseConfig"; // Import Firebase config
import { signOut } from "firebase/auth"; // Import signOut method
import ModeToggle from "./mode-toggle";
import { Sidebar } from "./Sidebar";
import { collection, setDoc, getDocs, query, where, doc } from "firebase/firestore";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const EditProfile: FC = () => {
  const [user, setUser] = useState<User | null>(null); // State to store logged-in user details
  const [firstName, setFirstName] = useState<string | null>("");
  const [lastName, setLastName] = useState<string | null>("");
  const [email, setEmail] = useState<string | null>("");
  const [phone, setPhone] = useState<number | null>();
  const [company, setCompany] = useState<string | null>("");
  const [department, setDepartment] = useState<string | null>("");
  const [gender, setGender] = useState<string | null>("");
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      
      if (currentUser) {
        const userDetails: User = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        };
        setUser(userDetails);
        setFirstName(userDetails.displayName?.split(' ')[0] || '');
        setLastName(userDetails.displayName?.split(' ')[1] || '');
        setEmail(userDetails.email || '');

        console.log(currentUser.providerData[0]?.providerId);

        // Check if the user logged in with Google
        const loggedInWithGoogle =
          currentUser.providerData[0]?.providerId === "google.com";

        setUser(userDetails);
        setIsGoogleUser(loggedInWithGoogle); // Update Google user status

        setFirstName(userDetails.displayName?.split(" ")[0] || "");
        setLastName(userDetails.displayName?.split(" ")[1] || "");
        setEmail(userDetails.email || "");
        
      } else {
        setUser(null);
        navigate("/login"); // Redirect to login if no user is logged in
      }
    });

    return () => unsubscribe(); // Clean up the listener on component unmount
  }, [navigate]);

  const fetchUserData = async (emailId: string | null | undefined) => {
    if (!emailId) {
      console.error("Email is required");
      return;
    }
  
    try {
      const q = query(collection(db, "users"), where("emailId", "==", emailId));
      const querySnapshot = await getDocs(q);
  
      // Check if a document was found
      if (querySnapshot.empty) {
        console.error("No user found with the given email.");
        alert("No user found with the provided email.");
        return;
      }
  
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      setFirstName(userData.name.split(" ")[0]);
      setLastName(userData.name.split(" ")[1]);
      setEmail(userData.emailId);
      setPhone(userData.phone);
      setCompany(userData.company);
      setDepartment(userData.department);
      setGender(userData.gender);
      console.log("User data fetched successfully:", userData);
      return userData;  // Return user data if found
  
    } catch (error) {
      console.error("Error fetching user data:", error);
      alert("Failed to fetch user data. Please try again.");
    }
  };

  useEffect(() => {
    const emailId = user?.email; 
    fetchUserData(emailId);
  }, [user?.email]);  

  const handleSaveChanges = async () => {
    if (!user) {
      console.error("User not logged in");
      return;
    }
  
    try {
      // Create an updated profile object
      const updatedProfile = {
        name: `${firstName} ${lastName}`,
        emailId: email,
        photoURL: user.photoURL,
        userType: "employee",
        phone: phone,
        company: company,
        department: department,
        gender: gender,
      };

      const q = query(collection(db, "users"), where("emailId", "==", email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.error("No user found with the given email.");
        return;
      }
  
      const dId = querySnapshot.docs[0].id;

        const postRef = doc(db, "users", dId);
        await setDoc(postRef, updatedProfile, { merge: true });
        console.log("Profile updated successfully:", updatedProfile);
        alert("Profile updated successfully!");
      } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };
  

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      <Sidebar user={user} activePage="none"/>
      <div className="flex flex-col h-screen">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10 bg-opacity-100 opacity-100">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  to="/"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Package2 className="h-6 w-6" />
                  <span className="sr-only">Acme Inc</span>
                </Link>
                <Link
                  to="/"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search or Type a Job"
                  className="h-10 px-3 mr-50 ring-offset-background file:border-0 file:bg-transparent file:text-sm 
                  file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
                  focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed py-2 ps-10 pe-16 
                  block w-1/2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-200 
                  focus:ring-0 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 
                  dark:text-neutral-400 dark:placeholder:text-neutral-400 dark:focus:ring-neutral-600"
                />
                <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none z-20 pe-3 text-gray-400">
                <Command className="absolute flex-shrink-0 size-3 text-gray-400 dark:text-white/60" />
                </div>
              </div>
            </form>
          </div>
          <div className="">
          <ModeToggle/>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User Avatar"
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <CircleUser className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.displayName || "My Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={()=>{navigate('/profile')}}>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 m-4 overflow-auto overflow-y-auto scrollbar-hide">
        <Tabs defaultValue="editprofile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10 sticky">
            <TabsTrigger value="editprofile">Edit your Profile</TabsTrigger>
            <TabsTrigger value="platform">Platform Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="editprofile">
            <div className="space-y-0.5">
              <div className="">
                <h2 className="text-2xl font-bold tracking-tight pt-2">Edit your Profile</h2>
                <p className="text-muted-foreground pb-6">Edit your profile information here</p>
                <Separator />
              </div>
              <h2 className="text-lg font-medium p-2">Profile Details</h2>
              <Separator className="shrink-0 bg-border h-[1px] my-2 w-1/2"/>
              <div className="pt-8 flex items-center">
              <div>
              {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="User Avatar"
                          className="h-20 w-20 rounded-full"
                        />
                      ) : (
                        <CircleUser className="h-5 w-5" />
                      )}
              </div>
                <Trash2 className="text-red-500 cursor-pointer"/>
              </div>

              <div className=" pt-4 flex flex-wrap gap-4">
                <div className="flex-1 sm:col-span-3 mr-3">
                  <Label htmlFor="first-name" className="block text-sm font-medium leading-6 text-gray-900">
                    First Name
                  </Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="first-name"
                      placeholder="First Name"
                      id="first-name"
                      value={firstName || ''}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isGoogleUser}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                <div className="flex-1 sm:col-span-3">
                  <Label htmlFor="last-name" className="block text-sm font-medium leading-6 text-gray-900">
                    Last Name
                  </Label>
                  <div className="mt-2">
                  <Input
                    type="text"
                    name="last-name"
                    placeholder="Last Name"
                    id="last-name"
                    value={lastName || ''}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isGoogleUser}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pb-3 flex flex-row">This is your public display name. {isGoogleUser && <p> (Non-editable due to Google Sign-in)</p>}</p>

              <div className="mt-4">
                <Label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                  Email
                </Label>
                <div className="mt-2">
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  id="email"
                  disabled
                  value={email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                </div>
              </div>
              <p className="text-sm text-muted-foreground pb-3">Please contact your administrator if you need to change your email.</p>


              <div className="flex flex-wrap gap-4">
                <div className="flex-1 sm:col-span-3 mr-3">
                  <Label htmlFor="phone-no" className="block text-sm font-medium leading-6 text-gray-900">
                    Phone Number
                  </Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="phone-no"
                      placeholder="Phone Number"
                      id="phone-no"
                      value={phone || ''}
                      onChange={(e) => setPhone(Number(e.target.value))}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                    <p className="text-sm text-muted-foreground pb-3">Please add your country code at the beginning of your phone number.</p>
                  </div>
                </div>

                <div className="flex-1 sm:col-span-3">
                  <Label htmlFor="gender" className="block text-sm font-medium leading-6 text-gray-900">
                    Gender
                  </Label>
                  <div className="mt-2">
                  <Select defaultValue={gender || undefined} onValueChange={setGender}>
                    <SelectTrigger className="">
                      <SelectValue placeholder="Select a gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel id="gender">Gender</SelectLabel>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex-1 sm:col-span-3 mr-3">
                  <Label htmlFor="company" className="block text-sm font-medium leading-6 text-gray-900">
                    Company
                  </Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="company"
                      placeholder="Company"
                      id="company"
                      value={company || ''}
                      onChange={(e) => setCompany(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground pb-3">Please enter the company name you work at. Keep blank if seeking first opportunity.</p>
                </div>

                <div className="flex-1 sm:col-span-3">
                  <Label htmlFor="department" className="block text-sm font-medium leading-6 text-gray-900">
                    Department
                  </Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="department"
                      placeholder="Department"
                      id="department"
                      value={department || ''}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex-1 sm:col-span-3 w-1/2">
                  <div className="mt-2">
                    <Button className="w-1/2" onClick={handleSaveChanges}>Save changes</Button>
                  </div>
              </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
};