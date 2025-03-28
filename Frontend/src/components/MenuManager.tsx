import { FC, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader1 from "./Loader";
import { auth, db } from "../Database/FirebaseConfig";
import { Sidebar } from "./Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { collection, setDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import { Header } from "./Header";
import ReactQuill from "react-quill";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const ManageMenu: FC = () => {
  const [user, setUser ] = useState<User | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State to control dialog visibility

  const { theme } = useTheme();

  const sweetAlertOptions: Record<string, unknown> = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser ) => {
      if (currentUser ) {
        setUser(currentUser);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchMenuItems = useCallback(async () => {
    try {
      const menuCollection = collection(db, "Menu");
      const menuSnapshot = await getDocs(menuCollection);
      const menuList = menuSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MenuItem[];
      setMenuItems(menuList);
    } catch (error) {
      console.error("Error fetching menu items: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!name || !description || price === "" || !category) {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Please fill in all fields.",
        icon: "error"
      });
      return;
    }

    const menuItemId = `${name}-${category}`; // Unique ID based on name and category

    try {
      const menuData = {
        name,
        description,
        price: Number(price),
        category,
      };

      const menuRef = doc(db, "Menu", menuItemId);
      await setDoc(menuRef, menuData);

      Swal.fire({
        ...sweetAlertOptions,
        title: "Success!",
        text: "Menu item created successfully!",
        icon: "success"
      });

      // Reset fields and close dialog
      setName("");
      setDescription("");
      setPrice("");
      setCategory("");
      setIsDialogOpen(false);
      fetchMenuItems();
    } catch (error) {
      console.error("Error creating menu item: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Something went wrong. Please try again!",
        icon: "error"
      });
    }
  };

  const handleDelete = async (menuItemId: string): Promise<void> => {
    Swal.fire({
      ...sweetAlertOptions,
      title: "Are you sure you want to delete this menu item?",
      showDenyButton: true,
      confirmButtonText: "Yes, delete item",
      denyButtonText: `No, don't delete`,
    }).then(async (result) => {
      if (result.isDenied) {
        return;
      } else if (result.isConfirmed) {
        try {
          const menuDoc = doc(db, "Menu", menuItemId);
          await deleteDoc(menuDoc);
          Swal.fire({
            ...sweetAlertOptions,
            title: "Success!",
            text: "Menu item deleted successfully!",
            icon: "success"
          });
          fetchMenuItems();
        } catch (error) {
          console.error("Error deleting menu item: ", error);
        }
      }
    });
  };

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      <Sidebar user={user} activePage="manage-menu" />
      <div className="flex flex-col h-screen">
        <Header/>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center">
            <h1 className="text-2xl text-primary font-bold">Manage Menu</h1>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="self-center">
                  Add Item <Plus className="ml-2 size-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Menu Item</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <Label className="text-left font-semibold">Item Name</Label>
                    <Input
                      type="text"
                      placeholder="Item Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Description</Label>
                    <ReactQuill
                      placeholder="Description"
                      value={description}
                      onChange={setDescription}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Photo</Label>
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => setPhoto(e.target.files[0])}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Price</Label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Category</Label>
                    <Input
                      type="text"
                      placeholder="Category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                </div>
                <DialogClose>
                  <Button variant="outline" onClick={handleSubmit} className="mt-4">
                    Submit
                  </Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>
          <div className="w-full flex flex-wrap place-self-center relative justify-center">
            {loading ? (
              <div className="absolute items-center justify-center bg-opacity-50 z-10">
                <Loader1 />
              </div>
            ) : menuItems.length === 0 ? (
              <p className="text-lg font-semibold text-gray-700 mt-0 text-left">
                No menu items available. Please add a menu item.
              </p>
            ) : (
              <div className="justify-center grid gap-x-16 gap-y-4 grid-cols-2 md:grid-cols-3 md:gap-y-4 md:gap-x-16 lg:grid-cols-3 lg:gap-x-24 lg:gap-y-3">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 shadow-md">
                    <h2 className="text-lg font-bold">{item.name}</h2>
                    <p>{item.description}</p>
                    <p className="font-semibold">Price: ${item.price.toFixed(2)}</p>
                    <p>Category: {item.category}</p>
                    <Button variant="outline" onClick={() => handleDelete(item.id)} className="mt-2">
                      <Trash2 className="mr-2" /> Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};