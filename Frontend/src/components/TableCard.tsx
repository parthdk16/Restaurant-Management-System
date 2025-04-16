import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Trash2, Receipt, PlusCircle, MinusCircle, Edit, Search, Vegan } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/Database/FirebaseConfig"; // Ensure your firebase config is set up correctly

// Define the MenuItem type based on Firestore structure
interface MenuItem {
  uniqueId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  photoURL?: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isVegetarian: boolean;
}

interface TableCardProps {
  id: string;
  tableNo: number;
  title: string;
  status: "available" | "reserved" | "occupied";
  onDelete: (tableId: string) => void;
  onStatusChange: (tableId: string, newStatus: string) => void;
}

const TAX_RATE = 0.08; // 8% tax rate

export function TableCard({
  id,
  title,
  status: initialStatus,
  onDelete,
  onStatusChange
}: TableCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [customerName, setCustomerName] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentTab, setCurrentTab] = useState("status");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [splitBill, setSplitBill] = useState(1);
  
  // Menu state management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [activeView, setActiveView] = useState<"category" | "search">("category");

  // Fetch menu items from Firestore
  useEffect(() => {
    const fetchMenuItems = async () => {
      setIsLoading(true);
      try {
        const menuCollection = collection(db, "Menu");
        const menuSnapshot = await getDocs(menuCollection);
        const menuData: MenuItem[] = [];
        
        menuSnapshot.forEach((doc) => {
          const data = doc.data() as MenuItem;
          if (data.isAvailable) {
            menuData.push(data);
          }
        });
        
        setMenuItems(menuData);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(menuData.map(item => item.category))];
        setCategories(uniqueCategories);
        
        if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }
        
      } catch (error) {
        console.error("Error fetching menu items:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMenuItems();
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = menuItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
  }, [searchQuery, menuItems]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() !== "") {
      setActiveView("search");
    } else {
      setActiveView("category");
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as "available" | "reserved" | "occupied");
    onStatusChange(id, newStatus);
    
    if (newStatus === "occupied") {
      setCurrentTab("order");
    } else {
      setOrderItems([]);
      setCustomerName("");
    }
  };

  const addItemToOrder = (item: MenuItem) => {
    console.log("Adding item to order:", item);
    const existingItemIndex = orderItems.findIndex(orderItem => orderItem.id === item.uniqueId);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      setOrderItems([...orderItems, {
        id: item.uniqueId,
        name: item.name,
        price: item.price,
        quantity: 1,
        isVegetarian: item.isVegetarian
      }]);
    }
  };

  const updateItemQuantity = (itemId: string, change: number) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setOrderItems(updatedItems);
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        return { ...item, notes };
      }
      return item;
    });
    
    setOrderItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * TAX_RATE;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const generateBill = () => {
    setShowBill(true);
    setCurrentTab("bill");
  };

  const completeOrder = () => {
    setStatus("available");
    setOrderItems([]);
    setCustomerName("");
    setNumberOfGuests(1);
    setShowBill(false);
    setCurrentTab("status");
    setIsDialogOpen(false);
    onStatusChange(id, "available");
  };

  const getStatusColor = () => {
    switch (status) {
      case "available": return "text-green-600";
      case "reserved": return "text-blue-600";
      case "occupied": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  // Get menu items based on selected category or search
  const getFilteredMenuItems = () => {
    if (activeView === "search") {
      return searchResults;
    } else {
      return menuItems.filter(item => item.category === selectedCategory);
    }
  };

  const renderMenuItems = () => {
    const items = getFilteredMenuItems();
    
    if (isLoading) {
      return <div className="flex justify-center py-8">Loading menu items...</div>;
    }
    
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {activeView === "search" ? "No items match your search" : "No items in this category"}
        </div>
      );
    }
  
    return (
      <div className="space-y-3">
        {items.map(item => {
          return (
            <div key={item.uniqueId} className="flex justify-between items-start border-b py-3">
              <div className="flex gap-3">
                {item.photoURL && (
                  <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={item.photoURL} 
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/api/placeholder/64/64";
                      }}
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.isVegetarian && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <Vegan className="h-3 w-3 mr-1" /> Veg
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                  <p className="text-sm font-semibold">${item.price.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addItemToOrder(item)} // Pass the local note
                >
                  Add
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // const renderMenuItems = () => {
  //   const items = getFilteredMenuItems();
    
  //   if (isLoading) {
  //     return <div className="flex justify-center py-8">Loading menu items...</div>;
  //   }
    
  //   if (items.length === 0) {
  //     return (
  //       <div className="text-center py-8 text-gray-500">
  //         {activeView === "search" ? "No items match your search" : "No items in this category"}
  //       </div>
  //     );
  //   }

  //   return (
  //     <div className="space-y-3">
  //       {items.map(item => (
  //         <div key={item.uniqueId} className="flex justify-between items-start border-b py-3">
  //           <div className="flex gap-3">
  //             {item.photoURL && (
  //               <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0">
  //                 <img 
  //                   src={item.photoURL} 
  //                   alt={item.name}
  //                   className="h-full w-full object-cover"
  //                   onError={(e) => {
  //                     // Handle image load errors
  //                     (e.target as HTMLImageElement).src = "/api/placeholder/64/64";
  //                   }}
  //                 />
  //               </div>
  //             )}
  //             <div>
  //               <div className="flex items-center gap-2">
  //                 <p className="font-medium">{item.name}</p>
  //                 {item.isVegetarian && (
  //                   <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
  //                     <Vegan className="h-3 w-3 mr-1" /> Veg
  //                   </Badge>
  //                 )}
  //               </div>
  //               <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
  //               <p className="text-sm font-semibold">${item.price.toFixed(2)}</p>
  //             </div>
  //           </div>
            
  //           <div className="flex items-center gap-2">
  //             <Input
  //               placeholder="Special instructions"
  //               className="w-32 text-xs"
  //               value={itemNote}
  //               onChange={(e) => setItemNote(e.target.value)}
  //             />
  //             <Button
  //               size="sm"
  //               variant="outline"
  //               onClick={() => addItemToOrder(item)}
  //             >
  //               Add
  //             </Button>
  //           </div>
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
        <DialogTrigger asChild>
          <Card 
            className="w-full min-w-[350px] min-h-[150px] max-w-[350px] rounded-lg border bg-white text-gray-800 shadow-sm cursor-pointer transition-transform duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg hover:border hover:border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 flex flex-col justify-between"
            onClick={() => setIsDialogOpen(true)}
          >
            <CardHeader className="flex-grow flex items-center justify-center p-4">
              <CardTitle className="text-center tracking-tight text-3xl font-semibold">
                {title}
              </CardTitle>
            </CardHeader>

            <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-600">
              <Trash2
                className="text-gray-500 hover:text-red-600 cursor-pointer transition-colors duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
              />
              <div className={`flex items-center gap-1 transition-colors duration-200 ${getStatusColor()}`}>
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </div>
            </div>
          </Card>
        </DialogTrigger>

        <DialogContent className="p-6 max-w-4xl w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold mb-4">
              {title} - {status.charAt(0).toUpperCase() + status.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <Separator className="my-4" />

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="status">Table Status</TabsTrigger>
              <TabsTrigger value="order" disabled={status !== "occupied"}>Order Management</TabsTrigger>
              <TabsTrigger value="bill" disabled={orderItems.length === 0 || status !== "occupied"}>Bill</TabsTrigger>
            </TabsList>

            {/* Table Status Tab */}
            <TabsContent value="status" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label className="text-left font-semibold mb-2 block">Table Status</Label>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status === "occupied" && (
                  <>
                    <div>
                      <Label className="text-left font-semibold mb-2 block">Customer Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter customer name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-left font-semibold mb-2 block">Number of Guests</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Number of guests"
                        value={numberOfGuests}
                        onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <Button onClick={() => setCurrentTab("order")}>
                      Continue to Order
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Order Management Tab */}
            <TabsContent value="order" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Menu Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">Menu Items</h3>
                  
                  {/* Search Input */}
                  <div className="mb-4 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-10 w-full"
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={handleSearch}
                      />
                      {searchQuery && (
                        <button
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setSearchQuery("");
                            setActiveView("category");
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Category Selection (only visible when not searching) */}
                  {activeView === "category" && (
                    <div className="mb-4">
                      <Label className="text-left font-semibold mb-2 block">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Display search results or category-filtered items */}
                  <ScrollArea className="h-72">
                    {renderMenuItems()}
                  </ScrollArea>
                </div>

                {/* Current Order Section */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Current Order</h3>
                    {customerName && (
                      <Badge variant="secondary">{customerName}</Badge>
                    )}
                  </div>

                  <ScrollArea className="h-72">
                    {orderItems.length === 0 ? (
                      <p className="text-center text-gray-500 my-8">No items added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {orderItems.map(item => (
                          <div key={item.id} className="border-b pb-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{item.name}</p>
                                  {item.isVegetarian && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                      <Vegan className="h-3 w-3 mr-1" /> Veg
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  ${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                                </p>
                                {item.notes && (
                                  <p className="text-xs italic text-gray-500">Note: {item.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(item.id, -1)}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span>{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(item.id, 1)}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Edit Notes</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <Input
                                        value={item.notes || ""}
                                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                        placeholder="Special instructions"
                                      />
                                    </div>
                                    <DialogClose asChild>
                                      <Button type="button" variant="default">
                                        Save Notes
                                      </Button>
                                    </DialogClose>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({(TAX_RATE * 100).toFixed(0)}%):</span>
                      <span>${calculateTax().toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-x-2 flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentTab("status")}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={generateBill}
                      disabled={orderItems.length === 0}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Generate Bill
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Bill Tab */}
            <TabsContent value="bill" className="space-y-4">
              <div className="border rounded-lg p-6 max-w-2xl mx-auto">
                <h2 className="text-center text-2xl font-bold mb-6">Bill Receipt</h2>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Table:</span>
                    <span>{title}</span>
                  </div>
                  {customerName && (
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Customer:</span>
                      <span>{customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Date:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Time:</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 mb-6">
                  <div className="grid grid-cols-4 font-semibold">
                    <div className="col-span-2">Item</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Price</div>
                  </div>
                  {orderItems.map(item => (
                    <div key={item.id} className="grid grid-cols-4">
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.isVegetarian && (
                            <Vegan className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs italic text-gray-500">{item.notes}</p>
                        )}
                      </div>
                      <div className="text-right">{item.quantity}</div>
                      <div className="text-right">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({(TAX_RATE * 100).toFixed(0)}%):</span>
                    <span>${calculateTax().toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                
                {numberOfGuests > 1 && (
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-2">Split Bill Options</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <Label>Split among:</Label>
                      <Select
                        value={splitBill.toString()}
                        onValueChange={(val) => setSplitBill(parseInt(val))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: numberOfGuests }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>guests</span>
                    </div>
                    
                    <div className="p-3 border rounded bg-white">
                      <div className="flex justify-between font-medium">
                        <span>Amount per person:</span>
                        <span>${(calculateTotal() / splitBill).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentTab("order")}
                  >
                    Back to Order
                  </Button>
                  <Button
                    onClick={completeOrder}
                  >
                    Finalize and Close Table
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// import { useState } from "react";
// import { Card, CardHeader, CardTitle } from "@/components/ui/card";
// import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { Button } from "./ui/button";
// import { Trash2 } from "lucide-react";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import { Input } from "./ui/input";

// interface JobCardProps {
//   id: string;
//   tableNo: number;
//   title: string;
//   status: string;
//   createdBy: string | null | undefined;
//   createdAt: string;
//   width?: string;
//   height?: string;
//   onDelete: (postId: string) => void;
// }

// export function TableCard({
//   id,
//   title,
//   tableNo,
//   status,
//   onDelete
// }: JobCardProps) {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//     const [customerName, setCustomerName] = useState("");
//     const [items, setItems] = useState<string[]>([]);
//     const [totalPrice, setTotalPrice] = useState<number | "">("");
//   return (
//     <div>
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
//         <DialogTrigger asChild>
//           <Card 
//               className="w-full min-w-[350px] min-h-[150px] max-w-[350px] rounded-lg border bg-white text-gray-800 shadow-sm cursor-pointer transition-transform duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg hover:border hover:border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 flex flex-col justify-between"
//               onClick={() => setIsDialogOpen(true)}
//           >
//             <CardHeader className="flex-grow flex items-center justify-center p-4">
//               <CardTitle className="text-center tracking-tight text-3xl font-semibold">
//                 {title}
//               </CardTitle>
//             </CardHeader>

//             <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-600">
//               <Trash2
//                 className="text-gray-500 hover:text-red-600 cursor-pointer transition-colors duration-200"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onDelete(id);
//                 }}
//               />
//               <div
//                 className={`flex items-center gap-1 transition-colors duration-200 
//                   ${status === "available" ? "text-green-600 hover:text-green-700" : ""}
//                   ${status === "occupied" ? "text-red-600 hover:text-red-700" : ""}
//                   ${status !== "available" && status !== "occupied" ? "text-gray-700 hover:text-blue-600" : ""}
//                 `}
//                 onClick={(e) => {
//                   e.stopPropagation();
//                 }}
//               >
//                 Status: {status.charAt(0).toUpperCase() + status.slice(1)}
//               </div>
//             </div>
//           </Card>
//         </DialogTrigger>

//         <DialogContent className="p-6 max-w-3xl mx-auto">
//           <DialogHeader>
//             <DialogTitle className="text-2xl font-semibold mb-4">{title}</DialogTitle>
//           </DialogHeader>
//           <Separator className="absolute top-20 left-0 w-full" />
//           <ScrollArea className="max-h-[410px] p-4">
//           <div className="space-y-4 mb-4">
//           </div>

//         </ScrollArea>
//           <div className="m-auto">
//              <Dialog>
//                 <DialogTrigger asChild>
//                   <Button variant="outline">
//                     Add Order to Table {tableNo}
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Add Order for Table {tableNo}</DialogTitle>
//                   </DialogHeader>
//                   <div className="grid gap-4">
//                     <div>
//                       <Label className="text-left font-semibold">Customer Name</Label>
//                       <Input
//                         type="text"
//                         placeholder="Customer Name"
//                         value={customerName}
//                         onChange={(e) => setCustomerName(e.target.value)}
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-left font-semibold">Items Ordered</Label>
//                       <Input
//                         type="text"
//                         placeholder="Items (comma separated)"
//                         value={items.join(", ")}
//                         onChange={(e) => setItems(e.target.value.split(",").map(item => item.trim()))}
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-left font-semibold">Total Price</Label>
//                       <Input
//                         type="number"
//                         placeholder="Total Price"
//                         value={totalPrice}
//                         onChange={(e) => setTotalPrice(Number(e.target.value))}
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-left font-semibold">Status</Label>
//                       <Select
//                         // value={status}
//                         // onValueChange={setStatus}
//                       >
//                         <SelectTrigger className="focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-neutral-100 dark:bg-neutral-900 border-neutral-700 dark:border-neutral-700 text-neutral-800 dark:text-neutral-400 placeholder-neutral-700 dark:placeholder-neutral-500 focus:ring-neutral-600 dark">
//                             <SelectValue placeholder="Select an option" className="w-full border rounded-md p-2" />
//                         </SelectTrigger>
//                         <SelectContent>
//                             <SelectItem value="pending">Pending</SelectItem>
//                             <SelectItem value="completed">Completed</SelectItem>
//                             <SelectItem value="canceled">Canceled</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                   <DialogClose>
//                     <Button variant="outline" className="mt-4">
//                       Submit Order
//                     </Button>
//                   </DialogClose>
//                 </DialogContent>
//               </Dialog>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }