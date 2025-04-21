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