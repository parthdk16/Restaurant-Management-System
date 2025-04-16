// import { FC, useState, useEffect } from "react";
// import { Plus, Minus, Trash2, Receipt, Edit, MoreHorizontal } from "lucide-react";
// import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where } from "firebase/firestore";
// import { db } from "../Database/FirebaseConfig";
// import Swal from 'sweetalert2';
// import { useTheme } from './theme-provider';
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
//   DialogClose,
// } from "@/components/ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// interface MenuItem {
//   id: string;
//   name: string;
//   price: number;
//   category: string;
//   description?: string;
//   available: boolean;
// }

// interface OrderItem {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface Table {
//   id: string;
//   tableNo: string;
//   capacity: number;
//   status: 'available' | 'occupied' | 'reserved';
// }

// interface Order {
//   id: string;
//   customerName: string;
//   customerPhone: string;
//   items: OrderItem[];
//   status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
//   tableNumber: string;
//   totalAmount: number;
//   paymentMethod: 'cash' | 'card' | 'upi';
//   paymentStatus: 'paid' | 'unpaid';
//   specialInstructions?: string;
//   createdAt: any;
//   updatedAt: any;
//   orderType: 'dine-in';
// }

// export const CreateDineInOrder: FC = () => {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
//   const [tables, setTables] = useState<Table[]>([]);
//   const [activeOrders, setActiveOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
//   const [selectedTableId, setSelectedTableId] = useState<string>("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [customerName, setCustomerName] = useState("");
//   const [customerPhone, setCustomerPhone] = useState("");
//   const [specialInstructions, setSpecialInstructions] = useState("");
//   const [categoryFilter, setCategoryFilter] = useState<string>("all");
//   const [categories, setCategories] = useState<string[]>([]);
//   const [dialogMode, setDialogMode] = useState<'create' | 'update' | 'bill'>('create');
//   const [currentOrderId, setCurrentOrderId] = useState<string>("");
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [activeTab, setActiveTab] = useState<string>("menu");

//   const { theme } = useTheme();

//   const sweetAlertOptions = {
//     background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
//     color: theme === "dark" ? '#fff' : '#000',
//     confirmButtonText: 'OK',
//     confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
//     cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
//   };

//   // Fetch data when component mounts or dialog opens
//   useEffect(() => {
//     if (isDialogOpen) {
//       fetchMenuItems();
//       fetchTables();
//       fetchActiveOrders();
//     }
//   }, [isDialogOpen]);

//   const fetchMenuItems = async () => {
//     try {
//       setLoading(true);
//       const menuCollection = collection(db, "Menu");
//       const menuSnapshot = await getDocs(menuCollection);
      
//       const items = menuSnapshot.docs
//         .map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         })) as MenuItem[];
      
//       // Extract unique categories
//       const uniqueCategories = Array.from(
//         new Set(items.map(item => item.category))
//       );
      
//       setMenuItems(items.filter(item => item.available));
//       setCategories(uniqueCategories);
//     } catch (error) {
//       console.error("Error fetching menu items: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to fetch menu items. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchTables = async () => {
//     try {
//       setLoading(true);
//       const tablesCollection = collection(db, "Tables");
//       const tablesSnapshot = await getDocs(tablesCollection);
      
//       const tablesList = tablesSnapshot.docs
//         .map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         })) as Table[];
      
//       setTables(tablesList);
//     } catch (error) {
//       console.error("Error fetching tables: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to fetch tables. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchActiveOrders = async () => {
//     try {
//       setLoading(true);
//       const ordersCollection = collection(db, "Orders");
//       const activeOrdersQuery = query(
//         ordersCollection,
//         where("orderType", "==", "dine-in"),
//         where("status", "in", ["pending", "preparing", "ready"])
//       );
      
//       const ordersSnapshot = await getDocs(activeOrdersQuery);
      
//       const ordersList = ordersSnapshot.docs
//         .map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         })) as Order[];
      
//       setActiveOrders(ordersList);
//     } catch (error) {
//       console.error("Error fetching active orders: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to fetch active orders. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddItem = (item: MenuItem) => {
//     // Check if item already exists in the selected items
//     const existingItemIndex = selectedItems.findIndex(
//       (selectedItem) => selectedItem.id === item.id
//     );

//     if (existingItemIndex >= 0) {
//       // If item exists, increase quantity
//       const updatedItems = [...selectedItems];
//       updatedItems[existingItemIndex].quantity += 1;
//       setSelectedItems(updatedItems);
//     } else {
//       // If item doesn't exist, add it with quantity 1
//       setSelectedItems([
//         ...selectedItems,
//         {
//           id: item.id,
//           name: item.name,
//           price: item.price,
//           quantity: 1,
//         },
//       ]);
//     }
//   };

//   const handleRemoveItem = (itemId: string) => {
//     const updatedItems = selectedItems.filter(item => item.id !== itemId);
//     setSelectedItems(updatedItems);
//   };

//   const handleQuantityChange = (itemId: string, change: number) => {
//     const updatedItems = selectedItems.map(item => {
//       if (item.id === itemId) {
//         const newQuantity = Math.max(1, item.quantity + change);
//         return { ...item, quantity: newQuantity };
//       }
//       return item;
//     });
//     setSelectedItems(updatedItems);
//   };

//   const calculateTotal = () => {
//     return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
//   };

//   const handleCreateOrder = async () => {
//     if (!customerName || !customerPhone || !selectedTableId || selectedItems.length === 0) {
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Missing Information",
//         text: "Please fill in all required fields and add at least one item to the order.",
//         icon: "warning"
//       });
//       return;
//     }

//     try {
//       setLoading(true);
      
//       // Get selected table information
//       const selectedTable = tables.find(table => table.id === selectedTableId);
      
//       // Create new order document
//       const ordersCollection = collection(db, "Orders");
//       const newOrder = {
//         customerName,
//         customerPhone,
//         items: selectedItems,
//         status: 'pending' as const,
//         tableNumber: selectedTable?.tableNo,
//         totalAmount: calculateTotal(),
//         paymentMethod: 'cash' as const, // Default to cash, can be updated later
//         paymentStatus: 'unpaid' as const,
//         specialInstructions: specialInstructions || "",
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//         orderType: 'dine-in' as const
//       };
      
//       const orderDocRef = await addDoc(ordersCollection, newOrder);
      
//       // Update table status to occupied
//       const tableDocRef = doc(db, "Tables", selectedTableId);
//       await updateDoc(tableDocRef, {
//         status: 'occupied'
//       });
      
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Success!",
//         text: `Order created successfully! Order ID: ${orderDocRef.id.slice(-6)}`,
//         icon: "success"
//       });
      
//       // Refresh data
//       fetchActiveOrders();
//       fetchTables();
      
//       // Reset form
//       resetForm();
      
//     } catch (error) {
//       console.error("Error creating order: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to create order. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleUpdateOrder = async () => {
//     if (!currentOrderId || selectedItems.length === 0) {
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error",
//         text: "No order selected or order items are empty",
//         icon: "error"
//       });
//       return;
//     }

//     try {
//       setLoading(true);
      
//       const orderDocRef = doc(db, "Orders", currentOrderId);
      
//       await updateDoc(orderDocRef, {
//         items: selectedItems,
//         totalAmount: calculateTotal(),
//         specialInstructions: specialInstructions,
//         updatedAt: serverTimestamp()
//       });
      
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Success!",
//         text: "Order updated successfully!",
//         icon: "success"
//       });
      
//       // Refresh active orders
//       fetchActiveOrders();
      
//       // Reset form and mode
//       resetForm();
//       setDialogMode('create');
      
//     } catch (error) {
//       console.error("Error updating order: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to update order. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGenerateBill = (order: Order) => {
//     setSelectedOrder(order);
//     setDialogMode('bill');
//   };

//   const handleEditOrder = (order: Order) => {
//     setCustomerName(order.customerName);
//     setCustomerPhone(order.customerPhone);
//     setSelectedItems(order.items);
//     setSpecialInstructions(order.specialInstructions || "");
//     setCurrentOrderId(order.id);
//     setDialogMode('update');
//     setActiveTab("menu");
//   };

//   const resetForm = () => {
//     setCustomerName("");
//     setCustomerPhone("");
//     setSelectedTableId("");
//     setSelectedItems([]);
//     setSpecialInstructions("");
//     setSearchTerm("");
//     setCategoryFilter("all");
//     setCurrentOrderId("");
//     setSelectedOrder(null);
//   };

//   const handleCloseDialog = () => {
//     resetForm();
//     setDialogMode('create');
//     setIsDialogOpen(false);
//   };

//   const filteredMenuItems = menuItems.filter(item => {
//     const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
//     return matchesSearch && matchesCategory;
//   });

//   const availableTables = tables.filter(table => table.status === 'available');

//   // Format date from Firebase timestamp
//   const formatDate = (timestamp: any) => {
//     if (!timestamp) return "N/A";
    
//     const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const renderOrderForm = () => (
//     <>
//       <div className="grid grid-cols-1 gap-4 mb-4">
//         {/* Customer Info and Table Selection - Only show in create mode */}
//         {dialogMode === 'create' && (
//           <Card>
//             <CardHeader>
//               <CardTitle>Order Information</CardTitle>
//             </CardHeader>
//             <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="customerName">Customer Name*</Label>
//                 <Input
//                   id="customerName"
//                   value={customerName}
//                   onChange={(e) => setCustomerName(e.target.value)}
//                   placeholder="Enter customer name"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="customerPhone">Phone Number*</Label>
//                 <Input
//                   id="customerPhone"
//                   value={customerPhone}
//                   onChange={(e) => setCustomerPhone(e.target.value)}
//                   placeholder="Enter phone number"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="tableSelection">Table*</Label>
//                 <Select value={selectedTableId} onValueChange={setSelectedTableId}>
//                   <SelectTrigger id="tableSelection">
//                     <SelectValue placeholder="Select a table" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {availableTables.length === 0 ? (
//                       <SelectItem value="no-tables" disabled>No available tables</SelectItem>
//                     ) : (
//                       availableTables.map((table) => (
//                         <SelectItem key={table.id} value={table.id}>
//                           Table {table.tableNo} (Seats {table.capacity})
//                         </SelectItem>
//                       ))
//                     )}
//                   </SelectContent>
//                 </Select>
//               </div>
//             </CardContent>
//           </Card>
//         )}
        
//         {/* Selected Items and Special Instructions */}
//         <Card className="mb-4">
//           <CardHeader>
//             <CardTitle>Order Summary</CardTitle>
//             {dialogMode === 'update' && (
//               <CardDescription>
//                 Updating order for Table {activeOrders.find(o => o.id === currentOrderId)?.tableNumber || "N/A"}
//               </CardDescription>
//             )}
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="space-y-2">
//               <h3 className="font-medium">Selected Items</h3>
//               {selectedItems.length === 0 ? (
//                 <p className="text-center py-4 text-gray-500">No items selected</p>
//               ) : (
//                 <div className="space-y-2 max-h-64 overflow-y-auto">
//                   {selectedItems.map((item) => (
//                     <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
//                       <div>
//                         <p className="font-medium">{item.name}</p>
//                         <p className="text-sm">₹{item.price.toFixed(2)} × {item.quantity}</p>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <Button 
//                           variant="outline" 
//                           size="icon" 
//                           onClick={() => handleQuantityChange(item.id, -1)}
//                         >
//                           <Minus className="size-4" />
//                         </Button>
//                         <span>{item.quantity}</span>
//                         <Button 
//                           variant="outline" 
//                           size="icon" 
//                           onClick={() => handleQuantityChange(item.id, 1)}
//                         >
//                           <Plus className="size-4" />
//                         </Button>
//                         <Button 
//                           variant="ghost" 
//                           size="icon" 
//                           onClick={() => handleRemoveItem(item.id)}
//                         >
//                           <Trash2 className="size-4" />
//                         </Button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
            
//             <div className="space-y-2">
//               <Label htmlFor="specialInstructions">Special Instructions</Label>
//               <Textarea
//                 id="specialInstructions"
//                 value={specialInstructions}
//                 onChange={(e) => setSpecialInstructions(e.target.value)}
//                 placeholder="Enter any special instructions or allergies"
//                 className="min-h-20"
//               />
//             </div>
            
//             <div className="flex justify-between pt-2 border-t">
//               <p className="font-semibold">Total Amount</p>
//               <p className="font-semibold">₹{calculateTotal().toFixed(2)}</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
      
//       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//         <TabsList className="grid grid-cols-2">
//           <TabsTrigger value="menu">Menu Items</TabsTrigger>
//           <TabsTrigger value="orders">Active Orders</TabsTrigger>
//         </TabsList>
        
//         <TabsContent value="menu" className="pt-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Menu Items</CardTitle>
//               <div className="flex flex-col sm:flex-row gap-2">
//                 <Input
//                   placeholder="Search items..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="flex-1"
//                 />
//                 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
//                   <SelectTrigger className="w-full sm:w-40">
//                     <SelectValue placeholder="Category" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All Categories</SelectItem>
//                     {categories.map((category) => (
//                       <SelectItem key={category} value={category}>
//                         {category}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="grid gap-2 max-h-96 overflow-y-auto">
//                 {loading ? (
//                   <p className="text-center py-4">Loading menu items...</p>
//                 ) : filteredMenuItems.length === 0 ? (
//                   <p className="text-center py-4 text-gray-500">No items found</p>
//                 ) : (
//                   filteredMenuItems.map((item) => (
//                     <div
//                       key={item.id}
//                       className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
//                       onClick={() => handleAddItem(item)}
//                     >
//                       <div>
//                         <p className="font-medium">{item.name}</p>
//                         <p className="text-sm text-gray-500">{item.category}</p>
//                         {item.description && (
//                           <p className="text-xs text-gray-400">{item.description}</p>
//                         )}
//                       </div>
//                       <div className="font-medium">₹{item.price.toFixed(2)}</div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
        
//         <TabsContent value="orders" className="pt-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Active Orders</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-2 max-h-96 overflow-y-auto">
//                 {loading ? (
//                   <p className="text-center py-4">Loading active orders...</p>
//                 ) : activeOrders.length === 0 ? (
//                   <p className="text-center py-4 text-gray-500">No active orders</p>
//                 ) : (
//                   activeOrders.map((order) => (
//                     <Card key={order.id} className="mb-2">
//                       <CardHeader className="pb-2">
//                         <div className="flex justify-between items-start">
//                           <div>
//                             <CardTitle className="text-base">Table {order.tableNumber}</CardTitle>
//                             <CardDescription>
//                               {order.customerName} • Order #{order.id.slice(-6)}
//                             </CardDescription>
//                           </div>
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" size="icon">
//                                 <MoreHorizontal className="size-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem onClick={() => handleEditOrder(order)}>
//                                 <Edit className="size-4 mr-2" /> Edit Order
//                               </DropdownMenuItem>
//                               <DropdownMenuItem onClick={() => handleGenerateBill(order)}>
//                                 <Receipt className="size-4 mr-2" /> Generate Bill
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>
//                       </CardHeader>
//                       <CardContent className="py-2">
//                         <div className="text-sm">
//                           <div className="flex justify-between text-gray-500">
//                             {/* <span>Items: {order.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
//                             <span>Total: ₹{order.totalAmount.toFixed(2)}</span> */}
//                            <span>Items: {order.createdAt}</span>
//                            <span>Total: ₹{(order.totalAmount || 0).toFixed(2)}</span>
//                           </div>
//                           <div className="text-xs text-gray-400 mt-1">
//                             Created: {formatDate(order.createdAt)}
//                           </div>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
      
//       <DialogFooter className="flex justify-between items-center mt-4">
//         <DialogClose asChild>
//           <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
//         </DialogClose>
//         {dialogMode === 'create' ? (
//           <Button 
//             onClick={handleCreateOrder} 
//             disabled={loading || selectedItems.length === 0 || !customerName || !customerPhone || !selectedTableId}
//           >
//             {loading ? "Creating Order..." : "Create Order"}
//           </Button>
//         ) : dialogMode === 'update' && (
//           <Button 
//             onClick={handleUpdateOrder} 
//             disabled={loading || selectedItems.length === 0}
//           >
//             {loading ? "Updating Order..." : "Update Order"}
//           </Button>
//         )}
//       </DialogFooter>
//     </>
//   );

//   const renderBillView = () => {
//     if (!selectedOrder) return null;
    
//     const subtotal = selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//     const taxRate = 0.05; // 5% tax
//     const tax = subtotal * taxRate;
//     const total = subtotal + tax;
    
//     return (
//       <>
//         <div className="grid grid-cols-1 gap-4 mb-4">
//           <Card>
//             <CardHeader className="pb-2 border-b">
//               <div className="flex justify-between">
//                 <div>
//                   <CardTitle>Bill Summary</CardTitle>
//                   <CardDescription>Order #{selectedOrder.id.slice(-6)}</CardDescription>
//                 </div>
//                 <div className="text-right">
//                   <p className="font-medium">Table {selectedOrder.tableNumber}</p>
//                   <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
//                 </div>
//               </div>
//             </CardHeader>
            
//             <CardContent className="pt-4">
//               <div className="space-y-4">
//                 <div>
//                   <h3 className="font-medium mb-2">Customer Information</h3>
//                   <div className="grid grid-cols-2 gap-2 text-sm">
//                     <div>
//                       <p className="text-gray-500">Name</p>
//                       <p>{selectedOrder.customerName}</p>
//                     </div>
//                     <div>
//                       <p className="text-gray-500">Phone</p>
//                       <p>{selectedOrder.customerPhone}</p>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div>
//                   <h3 className="font-medium mb-2">Order Items</h3>
//                   <div className="space-y-2">
//                     {selectedOrder.items.map((item, index) => (
//                       <div key={index} className="flex justify-between py-1 border-b text-sm">
//                         <div>
//                           <p>{item.name}</p>
//                           <p className="text-gray-500 text-xs">₹{item.price.toFixed(2)} × {item.quantity}</p>
//                         </div>
//                         <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
                
//                 {selectedOrder.specialInstructions && (
//                   <div>
//                     <h3 className="font-medium mb-1">Special Instructions</h3>
//                     <p className="text-sm">{selectedOrder.specialInstructions}</p>
//                   </div>
//                 )}
                
//                 <div className="pt-2 space-y-2">
//                   <div className="flex justify-between text-sm">
//                     <p>Subtotal</p>
//                     <p>₹{subtotal.toFixed(2)}</p>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <p>Tax (5%)</p>
//                     <p>₹{tax.toFixed(2)}</p>
//                   </div>
//                   <div className="flex justify-between font-medium pt-2 border-t">
//                     <p>Total Amount</p>
//                     <p>₹{total.toFixed(2)}</p>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
            
//             <CardFooter className="flex flex-col gap-2 border-t pt-4">
//               <div className="flex justify-between w-full text-sm">
//                 <p className="text-gray-500">Payment Status</p>
//                 <p className={selectedOrder.paymentStatus === 'paid' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
//                   {selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
//                 </p>
//               </div>
//               <div className="flex justify-between w-full text-sm">
//                 <p className="text-gray-500">Payment Method</p>
//                 <p>{selectedOrder.paymentMethod.toUpperCase()}</p>
//               </div>
//             </CardFooter>
//           </Card>
//         </div>
        
//         <DialogFooter className="flex justify-between items-center mt-4">
//           <Button variant="outline" onClick={() => setDialogMode('create')}>
//             Back to Orders
//           </Button>
//           <Button>
//             Print Bill
//           </Button>
//         </DialogFooter>
//       </>
//     );
//   };

//   return (
//     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//       <DialogTrigger asChild>
//         <Button>Restaurant Order System</Button>
//       </DialogTrigger>
//       <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle>
//             {dialogMode === 'create' && "Create Dine-In Order"}
//             {dialogMode === 'update' && "Update Order"}
//             {dialogMode === 'bill' && "Generate Bill"}
//           </DialogTitle>
//         </DialogHeader>
        
//         {dialogMode === 'bill' ? renderBillView() : renderOrderForm()}
//       </DialogContent>
//     </Dialog>
//   );
// };

import { FC, useState, useEffect } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../Database/FirebaseConfig";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  available: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Table {
  id: string;
  tableNo: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

export const CreateDineInOrder: FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  const { theme } = useTheme();

  const sweetAlertOptions = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  // Fetch menu items and tables when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      fetchMenuItems();
      fetchTables();
    }
  }, [isDialogOpen]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const menuCollection = collection(db, "Menu");
      const menuSnapshot = await getDocs(menuCollection);
      
      const items = menuSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MenuItem[];
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(items.map(item => item.category))
      );
      
      setMenuItems(items.filter(item => item.available));
      setCategories(uniqueCategories);
      console.log("Menu items fetched successfully:", items);
      console.log("Unique categories:", uniqueCategories);
      
    } catch (error) {
      console.error("Error fetching menu items: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to fetch menu items. Please try again.",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const tablesCollection = collection(db, "Tables");
      const tablesSnapshot = await getDocs(tablesCollection);
      
      const tablesList = tablesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Table[];
      
      setTables(tablesList);

    } catch (error) {
      console.error("Error fetching tables: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to fetch tables. Please try again.",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (item: MenuItem) => {
    // Check if item already exists in the selected items
    const existingItemIndex = selectedItems.findIndex(
      (selectedItem) => selectedItem.id === item.id
    );

    if (existingItemIndex >= 0) {
      // If item exists, increase quantity
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      // If item doesn't exist, add it with quantity 1
      setSelectedItems([
        ...selectedItems,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = selectedItems.filter(item => item.id !== itemId);
    setSelectedItems(updatedItems);
  };

  const handleQuantityChange = (itemId: string, change: number) => {
    const updatedItems = selectedItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setSelectedItems(updatedItems);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (!customerName || !customerPhone || !selectedTableId || selectedItems.length === 0) {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Missing Information",
        text: "Please fill in all required fields and add at least one item to the order.",
        icon: "warning"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get selected table information
      const selectedTable = tables.find(table => table.id === selectedTableId);
      
      // Create new order document
      const ordersCollection = collection(db, "Orders");
      const newOrder = {
        customerName,
        customerPhone,
        items: selectedItems,
        status: 'pending' as const,
        tableNumber: selectedTable?.tableNumber,
        totalAmount: calculateTotal(),
        paymentMethod: 'cash' as const, // Default to cash, can be updated later
        paymentStatus: 'unpaid' as const,
        specialInstructions: specialInstructions || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        orderType: 'dine-in' as const
      };
      
      const orderDocRef = await addDoc(ordersCollection, newOrder);
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Success!",
        text: `Order created successfully! Order ID: ${orderDocRef.id.slice(-6)}`,
        icon: "success"
      });
      
      // Reset form
      resetForm();
      setIsDialogOpen(false);
      
    } catch (error) {
      console.error("Error creating order: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to create order. Please try again.",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTableId("");
    setSelectedItems([]);
    setSpecialInstructions("");
    setSearchTerm("");
    setCategoryFilter("all");
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const availableTables = tables.filter(table => table.status === 'available');

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Create Dine-In Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Dine-In Order</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Customer Info and Table Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name*</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number*</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Table Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.length === 0 ? (
                      <SelectItem value="no-tables" disabled>No available tables</SelectItem>
                    ) : (
                      availableTables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Table {table.tableNo}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Enter any special instructions or allergies"
                  className="min-h-24"
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Menu Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selected Items</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItems.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">No items selected</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm">₹{item.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleQuantityChange(item.id, -1)}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span>{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleQuantityChange(item.id, 1)}
                          >
                            <Plus className="size-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="font-semibold">Total</p>
                <p className="font-semibold">₹{calculateTotal().toFixed(2)}</p>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Menu Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2 max-h-72 overflow-y-auto">
                  {loading ? (
                    <p className="text-center py-4">Loading menu items...</p>
                  ) : filteredMenuItems.length === 0 ? (
                    <p className="text-center py-4 text-gray-500">No items found</p>
                  ) : (
                    filteredMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleAddItem(item)}
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                        <div className="font-medium">₹{item.price.toFixed(2)}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between items-center mt-4">
          <DialogClose asChild>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleSubmitOrder} 
            disabled={loading || selectedItems.length === 0 || !customerName || !customerPhone || !selectedTableId}
          >
            {loading ? "Creating Order..." : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};