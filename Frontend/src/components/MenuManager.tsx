import { FC, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader1 from "./Loader";
import { auth, db } from "../Database/FirebaseConfig";
import { Sidebar } from "./Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { collection, setDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import { Header } from "./Header";
import ReactQuill from "react-quill";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAXZ5NGL33FNF5YITQ',
    secretAccessKey: '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'
  }
});

const S3_BUCKET = 'hotel-shripad';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  photoURL?: string;
  photoKey?: string;
  available: boolean;
  veg: boolean;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const ManageMenu: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [veg, setVeg] = useState<boolean>(true);
  const [available, setAvailable] = useState<boolean>(true);
  const [price, setPrice] = useState<number | "">("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoURL, setPhotoURL] = useState<string>("");
  const [photoKey, setPhotoKey] = useState<string>("");
  const [category, setCategory] = useState("");
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { theme } = useTheme();

  const sweetAlertOptions: Record<string, unknown> = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setPhoto(null);
    setVeg(false);
    setAvailable(false);
    setPhoto(null);
    setPhotoURL("");
    setPhotoKey("");
    setIsEditing(false);
    setEditingItemId(null);
    setUploadingPhoto(false);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItemId(item.id);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price);
    setCategory(item.category);
    setVeg(item.veg);
    setAvailable(item.available);
    setPhotoURL(item.photoURL || "");
    setPhotoKey(item.photoKey || "");
    setIsEditing(true);
    setIsEditDialogOpen(true);
  };

  const uploadToS3 = async (file: File, key: string): Promise<{url: string, key: string}> => {
    setUploadingPhoto(true);

    try {
      // Create the upload command
      const uploadParams = {
        Bucket: S3_BUCKET,
        Key: key,
        Body: file,
        ContentType: file.type,
        ACL: 'public-read' as const
      };

      // Execute the upload
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      // Construct the URL (S3 pattern is predictable)
      const url = `https://hotel-shripad.s3.us-east-1.amazonaws.com/${key}`;
      
      return {
        url,
        key
      };
    } catch (error) {
      console.error("Error uploading to S3: ", error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deleteFromS3 = async (key: string): Promise<void> => {
    try {
      const deleteParams = {
        Bucket: S3_BUCKET,
        Key: key
      };

      const command = new DeleteObjectCommand(deleteParams);
      await s3Client.send(command);
    } catch (error) {
      console.error("Error deleting from S3: ", error);
      throw error;
    }
  };

  const handlePhotoUpload = async (itemId: string): Promise<{url: string, key: string} | null> => {
    if (!photo) return null;
    
    try {
      const fileExt = photo.name.split('.').pop();
      const key = `menu/${itemId}/${Date.now()}.${fileExt}`;
      
      return await uploadToS3(photo, key);
    } catch (error) {
      console.error("Error uploading photo: ", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!name || !description || !price || !category) {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Please fill in all required fields.",
        icon: "error"
      });
      return;
    }

    try {
      setLoading(true);
      const menuItemId = isEditing ? editingItemId! : `${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}`;
      let photoData = { url: photoURL, key: photoKey };

      if (photo) {
        const uploadResult = await handlePhotoUpload(menuItemId);
        
        if (uploadResult) {
          photoData = {
            url: uploadResult.url,
            key: uploadResult.key
          };
          
          // If editing and there was a previous photo, delete it
          if (isEditing && photoKey) {
            try {
              await deleteFromS3(photoKey);
            } catch (deleteError) {
              console.error("Failed to delete old photo, continuing anyway: ", deleteError);
            }
          }
        }
      }

      const menuData = {
        name,
        description,
        price: Number(price),
        category,
        isVegetarian: veg,
        isAvailable: available,
        photoURL: photoData.url,
        photoKey: photoData.key
      };

      if (isEditing) {
        const menuRef = doc(db, "Menu", menuItemId);
        await updateDoc(menuRef, menuData);
        Swal.fire({
          ...sweetAlertOptions,
          title: "Success!",
          text: "Menu item updated successfully!",
          icon: "success"
        });
      } else {
        const menuRef = doc(db, "Menu", menuItemId);
        await setDoc(menuRef, menuData);
        Swal.fire({
          ...sweetAlertOptions,
          title: "Success!",
          text: "Menu item created successfully!",
          icon: "success"
        });
      }

      resetForm();
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      fetchMenuItems();
    } catch (error) {
      console.error("Error saving menu item: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Something went wrong. Please try again!",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (menuItemId: string, photoKey?: string): Promise<void> => {
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
          setLoading(true);
          
          // Delete from Firestore
          const menuDoc = doc(db, "Menu", menuItemId);
          await deleteDoc(menuDoc);
          
          // Delete the photo from S3 if it exists
          if (photoKey) {
            try {
              await deleteFromS3(photoKey);
            } catch (deleteError) {
              console.error("Error deleting photo from S3: ", deleteError);
            }
          }
          
          Swal.fire({
            ...sweetAlertOptions,
            title: "Success!",
            text: "Menu item deleted successfully!",
            icon: "success"
          });
          fetchMenuItems();
        } catch (error) {
          console.error("Error deleting menu item: ", error);
          Swal.fire({
            ...sweetAlertOptions,
            title: "Error!",
            text: "Something went wrong while deleting. Please try again!",
            icon: "error"
          });
        } finally {
          setLoading(false);
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
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setIsAddDialogOpen(open);
            }}>
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
                    <Label className="text-left font-semibold">Item Name*</Label>
                    <Input
                      type="text"
                      placeholder="Item Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Description*</Label>
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
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPhoto(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Price* (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Category*</Label>
                    <Input
                      type="text"
                      placeholder="Category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Type*</Label>
                    <RadioGroup defaultValue="true" onValueChange={(value) => setVeg(value === "true")} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="r1" />
                        <Label htmlFor="r1">Vegetarian</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="r2" />
                        <Label htmlFor="r2">Non-vegetarian</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-left font-semibold">Availability*</Label>
                    <RadioGroup defaultValue="available" onValueChange={(value) => setAvailable(value === "available")} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="available" id="r1" />
                        <Label htmlFor="r1">Available</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not-available" id="r2" />
                        <Label htmlFor="r2">Not available</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    variant="default" 
                    onClick={handleSubmit}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? "Uploading..." : "Submit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="w-full flex flex-wrap place-self-center relative justify-center">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-opacity-50 z-10">
                <Loader1 />
              </div>
            ) : menuItems.length === 0 ? (
              <p className="text-lg font-semibold text-gray-700 mt-0 text-left">
                No menu items available. Please add a menu item.
              </p>
            ) : (
              <div className="justify-center grid gap-x-8 gap-y-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 shadow-md hover:border-gray-400 transition-all">
                    <div className="flex flex-row justify-between mb-2">
                      <h2 className="text-lg font-bold truncate">{item.name}</h2>
                      <Button 
                        variant='ghost'
                        onClick={() => openEditDialog(item)}
                        className="text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="size-5" />
                      </Button>
                    </div>
                    {item.photoURL && (
                      <div className="mb-2">
                        <img 
                          src={item.photoURL} 
                          alt={item.name} 
                          className="w-full h-36 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="h-20 overflow-y-auto mb-2">
                      <div dangerouslySetInnerHTML={{ __html: item.description }} />
                    </div>
                    <p className="font-semibold">Price: ₹{item.price.toFixed(2)}</p>
                    <p className="mb-3">Category: {item.category}</p>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDelete(item.id, item.photoKey)} 
                      className="w-full hover:text-red-500 hover:border-red-500 transition-colors"
                    >
                      <Trash2 className="mr-2 size-4" /> Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsEditDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-left font-semibold">Item Name*</Label>
              <Input
                type="text"
                placeholder="Item Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-left font-semibold">Description*</Label>
              <ReactQuill
                placeholder="Description"
                value={description}
                onChange={setDescription}
              />
            </div>
            <div>
              <Label className="text-left font-semibold">Current Photo</Label>
              {photoURL ? (
                <div className="mt-1 mb-2">
                  <img 
                    src={photoURL} 
                    alt="Current menu item" 
                    className="w-32 h-32 object-cover rounded-md"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">No photo available</p>
              )}
              <Label className="text-left font-semibold mt-2">Update Photo</Label>
              <Input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPhoto(e.target.files[0]);
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-left font-semibold">Price* (₹)</Label>
              <Input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-left font-semibold">Category*</Label>
              <Input
                type="text"
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="default" 
              onClick={handleSubmit}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? "Uploading..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// import { FC, useEffect, useState, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import { Pencil, Plus, Trash2 } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import Loader1 from "./Loader";
// import { auth, db } from "../Database/FirebaseConfig";
// import { Sidebar } from "./Sidebar";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
// import { Label } from "@radix-ui/react-label";
// import { collection, setDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
// import Swal from 'sweetalert2';
// import { useTheme } from './theme-provider';
// import { Header } from "./Header";
// import ReactQuill from "react-quill";

// interface MenuItem {
//   id: string;
//   name: string;
//   description: string;
//   price: number;
//   category: string;
// }

// interface User {
//   uid: string;
//   email: string | null;
//   displayName: string | null;
//   photoURL: string | null;
// }

// export const ManageMenu: FC = () => {
//   const [user, setUser ] = useState<User | null>(null);
//   const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
//   const [price, setPrice] = useState<number | "">("");
//   const [photo, setPhoto] = useState<File | null>(null);
//   const [category, setCategory] = useState("");
//   const navigate = useNavigate();
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isDialogOpen2, setIsDialogOpen2] = useState(false);

//   const { theme } = useTheme();

//   const sweetAlertOptions: Record<string, unknown> = {
//     background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
//     color: theme === "dark" ? '#fff' : '#000',
//     confirmButtonText: 'OK',
//     confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
//     cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
//   };

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((currentUser ) => {
//       if (currentUser ) {
//         setUser(currentUser);
//       } else {
//         navigate("/login");
//       }
//     });
//     return () => unsubscribe();
//   }, [navigate]);

//   const fetchMenuItems = useCallback(async () => {
//     try {
//       const menuCollection = collection(db, "Menu");
//       const menuSnapshot = await getDocs(menuCollection);
//       const menuList = menuSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       })) as MenuItem[];
//       setMenuItems(menuList);
//     } catch (error) {
//       console.error("Error fetching menu items: ", error);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const handleSubmit = async () => {
//     if (!name || !description || !price || !category || !photo) {
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Please fill in all fields.",
//         icon: "error"
//       });
//       return;
//     }

//     const menuItemId = `${name}-${category}`;

//     try {
//       const menuData = {
//         name,
//         description,
//         price: Number(price),
//         category,
//       };

//       const menuRef = doc(db, "Menu", menuItemId);
//       await setDoc(menuRef, menuData);

//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Success!",
//         text: "Menu item created successfully!",
//         icon: "success"
//       });

//       setName("");
//       setDescription("");
//       setPrice("");
//       setCategory("");
//       setIsDialogOpen(false);
//       fetchMenuItems();
//     } catch (error) {
//       console.error("Error creating menu item: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Something went wrong. Please try again!",
//         icon: "error"
//       });
//     }
//   };

//   const handleDelete = async (menuItemId: string): Promise<void> => {
//     Swal.fire({
//       ...sweetAlertOptions,
//       title: "Are you sure you want to delete this menu item?",
//       showDenyButton: true,
//       confirmButtonText: "Yes, delete item",
//       denyButtonText: `No, don't delete`,
//     }).then(async (result) => {
//       if (result.isDenied) {
//         return;
//       } else if (result.isConfirmed) {
//         try {
//           const menuDoc = doc(db, "Menu", menuItemId);
//           await deleteDoc(menuDoc);
//           Swal.fire({
//             ...sweetAlertOptions,
//             title: "Success!",
//             text: "Menu item deleted successfully!",
//             icon: "success"
//           });
//           fetchMenuItems();
//         } catch (error) {
//           console.error("Error deleting menu item: ", error);
//         }
//       }
//     });
//   };

//   useEffect(() => {
//     fetchMenuItems();
//   }, [fetchMenuItems]);

//   return (
//     <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
//       <Sidebar user={user} activePage="manage-menu" />
//       <div className="flex flex-col h-screen">
//         <Header/>
//         <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
//           <div className="flex items-center">
//             <h1 className="text-2xl text-primary font-bold">Manage Menu</h1>
//           </div>
//           <div className="flex flex-row gap-4 items-center">
//             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//               <DialogTrigger asChild>
//                 <Button variant="outline" className="self-center">
//                   Add Item <Plus className="ml-2 size-5" />
//                 </Button>
//               </DialogTrigger>
//               <DialogContent>
//                 <DialogHeader>
//                   <DialogTitle>Add Menu Item</DialogTitle>
//                 </DialogHeader>
//                 <div className="grid gap-4">
//                   <div>
//                     <Label className="text-left font-semibold">Item Name</Label>
//                     <Input
//                       type="text"
//                       placeholder="Item Name"
//                       value={name}
//                       onChange={(e) => setName(e.target.value)}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-left font-semibold">Description</Label>
//                     <ReactQuill
//                       placeholder="Description"
//                       value={description}
//                       onChange={setDescription}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-left font-semibold">Photo</Label>
//                     <Input
//                       type="file"
//                       accept=".jpg,.jpeg,.png"
//                       onChange={(e) => {
//                         if (e.target.files && e.target.files[0]) {
//                           setPhoto(e.target.files[0]);
//                         }
//                       }}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-left font-semibold">Price</Label>
//                     <Input
//                       type="number"
//                       placeholder="Price"
//                       value={price}
//                       onChange={(e) => setPrice(Number(e.target.value))}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-left font-semibold">Category</Label>
//                     <Input
//                       type="text"
//                       placeholder="Category"
//                       value={category}
//                       onChange={(e) => setCategory(e.target.value)}
//                     />
//                   </div>
//                 </div>
//                 <DialogClose>
//                   <Button variant="outline" onClick={handleSubmit} className="mt-4">
//                     Submit
//                   </Button>
//                 </DialogClose>
//               </DialogContent>
//             </Dialog>
//           </div>
//           <div className="w-full flex flex-wrap place-self-center relative justify-center">
//             {loading ? (
//               <div className="absolute items-center justify-center bg-opacity-50 z-10">
//                 <Loader1 />
//               </div>
//             ) : menuItems.length === 0 ? (
//               <p className="text-lg font-semibold text-gray-700 mt-0 text-left">
//                 No menu items available. Please add a menu item.
//               </p>
//             ) : (
//               <div className="justify-center grid gap-x-16 gap-y-4 grid-cols-2 md:grid-cols-3 md:gap-y-4 md:gap-x-16 lg:grid-cols-4 lg:gap-x-18 lg:gap-y-3">
//                 {menuItems.map((item) => (
//                   <div key={item.id} className="border rounded-lg p-4 shadow-md hover:border-black">
//                     <div className="flex flex-row justify-between">
//                       <h2 className="text-lg font-bold">{item.name}</h2>
//                       <Dialog open={isDialogOpen2} onOpenChange={setIsDialogOpen2}>
//                         <DialogTrigger asChild>
//                           <Pencil className="hover:cursor-pointer hover:text-blue-800"/>
//                         </DialogTrigger>
//                         <DialogContent>
//                           <DialogHeader>
//                             <DialogTitle>Edit Menu Item</DialogTitle>
//                           </DialogHeader>
//                           <div className="grid gap-4">
//                             <div>
//                               <Label className="text-left font-semibold">Item Name</Label>
//                               <Input
//                                 type="text"
//                                 placeholder="Item Name"
//                                 value={item.name}
//                                 onChange={(e) => setName(e.target.value)}
//                               />
//                             </div>
//                             <div>
//                               <Label className="text-left font-semibold">Description</Label>
//                               <ReactQuill
//                                 placeholder="Description"
//                                 value={item.description}
//                                 onChange={setDescription}
//                               />
//                             </div>
//                             <div>
//                               <Label className="text-left font-semibold">Photo</Label>
//                               <Input
//                                 type="file"
//                                 accept=".jpg,.jpeg,.png"
//                                 onChange={(e) => {
//                                   if (e.target.files && e.target.files[0]) {
//                                     setPhoto(e.target.files[0]);
//                                   }
//                                 }}
//                               />
//                             </div>
//                             <div>
//                               <Label className="text-left font-semibold">Price</Label>
//                               <Input
//                                 type="number"
//                                 placeholder="Price"
//                                 value={item.price}
//                                 onChange={(e) => setPrice(Number(e.target.value))}
//                               />
//                             </div>
//                             <div>
//                               <Label className="text-left font-semibold">Category</Label>
//                               <Input
//                                 type="text"
//                                 placeholder="Category"
//                                 value={item.category}
//                                 onChange={(e) => setCategory(e.target.value)}
//                               />
//                             </div>
//                           </div>
//                           <DialogClose>
//                             <Button variant='default' onClick={handleSubmit} className="mt-4">
//                               Submit
//                             </Button>
//                           </DialogClose>
//                         </DialogContent>
//                       </Dialog>
//                     </div>
//                     <p>{item.description}</p>
//                     <p className="font-semibold">Price: ₹{item.price.toFixed(2)}</p>
//                     <p>Category: {item.category}</p>
//                     <Button variant="outline" onClick={() => handleDelete(item.id)} className="mt-2 hover:text-red-500">
//                       <Trash2 className="mr-2" /> Delete
//                     </Button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };