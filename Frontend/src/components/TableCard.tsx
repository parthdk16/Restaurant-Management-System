import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { addDoc, collection, deleteDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/Database/FirebaseConfig";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { CheckCircle, QrCode, CreditCard } from "lucide-react";

interface TransactionDetails {
  paymentMethod: "cash" | "card" | "upi";
  cashAmount?: number;
  cashChange?: number;
  cardType?: string;
  cardLastFour?: string;
  upiId?: string;
  upiReference?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

// Define the MenuItem type based on Firestore structure
interface MenuItem {
  itemCode: number;
  name: string;
  category: string;
  description: string;
  price: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  photoURL?: string;
}

interface OrderItem {
  id: number;
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
  tableNo,
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
  // const [showBill, setShowBill] = useState(false);
  const [splitBill, setSplitBill] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  // const [transactionDetails, setTransactionDetails] = useState<TransactionDetails>({
  //   paymentMethod: "cash"
  // });
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cardType, setCardType] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiReference, setUpiReference] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showUpiOptions, setShowUpiOptions] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'' | 'qr' | 'upi-id'>('');
  const [upiIdError, setUpiIdError] = useState('');
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  
  // Menu state management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [activeView, setActiveView] = useState<"category" | "search">("category");

  // On component mount
  useEffect(() => {
    const fetchTableOrders = async () => {
      try {
        const tableOrdersCollection = collection(db, "TableOrders");
        const orderSnapshot = await getDocs(query(tableOrdersCollection, where("tableId", "==", id)));
        
        if (!orderSnapshot.empty) {
          const orderData = orderSnapshot.docs[0].data();
          setStatus(orderData.status);
          setCustomerName(orderData.customerName);
          setNumberOfGuests(orderData.numberOfGuests);
          setOrderItems(orderData.items);
        }
      } catch (error) {
        console.error("Error fetching table orders:", error);
      }
    };
    
    fetchTableOrders();
  }, [id]);

  // Function to save table order data
  const saveTableOrder = async () => {
    try {
      const tableOrdersCollection = collection(db, "TableOrders");
      const orderSnapshot = await getDocs(query(tableOrdersCollection, where("tableId", "==", id)));
      
      const orderData = {
        tableId: id,
        tableNo: tableNo,
        status: status,
        customerName: customerName,
        numberOfGuests: numberOfGuests,
        items: orderItems,
        timestamp: new Date()
      };
      
      if (orderSnapshot.empty) {
        // Create new order
        await addDoc(tableOrdersCollection, orderData);
      } else {
        // Update existing order
        const docRef = orderSnapshot.docs[0].ref;
        await updateDoc(docRef, orderData);
      }
    } catch (error) {
      console.error("Error saving table order:", error);
    }
  };

  // Call saveTableOrder whenever order data changes
  useEffect(() => {
    if (status === "occupied" && (customerName || orderItems.length > 0)) {
      saveTableOrder();
    }
  }, [status, customerName, numberOfGuests, orderItems]);

  const processPayment = async () => {
    setIsProcessingPayment(true);
  
    try {
      // Build payment details based on selected method
      const paymentDetails: TransactionDetails = {
        paymentMethod,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null
      };
  
      if (paymentMethod === "cash") {
        const cashAmountValue = parseFloat(cashAmount);
        paymentDetails.cashAmount = cashAmountValue;
        paymentDetails.cashChange = cashAmountValue - calculateTotal();
      } else if (paymentMethod === "card") {
        paymentDetails.cardType = cardType;
        paymentDetails.cardLastFour = cardLastFour;
      } else if (paymentMethod === "upi") {
        paymentDetails.upiId = upiId;
        paymentDetails.upiReference = upiReference;
      }
  
      // Record transaction in Firestore
      const transactionsCollection = collection(db, "Transactions");
      await addDoc(transactionsCollection, {
        tableId: id,
        tableNo: tableNo,
        customerName: customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        paymentStatus: "paid",
        type: "payment",
        items: orderItems,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        amount: calculateTotal(),
        createdAt: new Date()
      });
      
      // Once transaction is recorded, proceed with order completion
      await completeOrder(paymentDetails);
      
      // setPaymentSuccess(true);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error processing payment:", error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const validateAndProceedUpiPayment = () => {
    // Simple UPI ID validation
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiRegex.test(upiId)) {
      setUpiIdError('Please enter a valid UPI ID (e.g., username@bankname)');
      return;
    }
    
    setUpiIdError('');
    setUpiPaymentInitiated(true);
  };

  const completeOrder = async (paymentDetails?: TransactionDetails) => {
    try {
      // 1. Create completed order record
      const completedOrdersCollection = collection(db, "Orders");
      await addDoc(completedOrdersCollection, {
        tableId: id,
        tableNo: tableNo,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        numberOfGuests: numberOfGuests,
        items: orderItems,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        timestamp: new Date(),
        splitAmount: splitBill > 1 ? (calculateTotal() / splitBill) : null,
        splitCount: splitBill,
        payment: paymentDetails || null
      });
      
      // 2. Delete the active table order
      const tableOrdersCollection = collection(db, "TableOrders");
      const orderSnapshot = await getDocs(query(tableOrdersCollection, where("tableId", "==", id)));
      if (!orderSnapshot.empty) {
        const docRef = orderSnapshot.docs[0].ref;
        await deleteDoc(docRef);
      }
      
      // 3. Reset local state
      setStatus("available");
      setOrderItems([]);
      setCustomerName("");
      setNumberOfGuests(1);
      // setShowBill(false);
      resetPaymentDetails();
      setCurrentTab("status");
      onStatusChange(id, "available");
    } catch (error) {
      console.error("Error completing order:", error);
    }
  };

  const resetPaymentDetails = () => {
    setPaymentMethod("cash");
    setCashAmount("");
    setCardType("");
    setCardLastFour("");
    setUpiId("");
    setUpiReference("");
    setCustomerEmail("");
    setCustomerPhone("");
    // setTransactionDetails({ paymentMethod: "cash" });
  };

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
    const existingItemIndex = orderItems.findIndex(orderItem => orderItem.name === item.name);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      setOrderItems([...orderItems, {
        id: item.itemCode,
        name: item.name,
        price: item.price,
        quantity: 1,
        isVegetarian: item.isVegetarian
      }]);
    }
  };

  const updateItemQuantity = (itemId: number, change: number) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setOrderItems(updatedItems);
  };

  const updateItemNotes = (itemId: number, notes: string) => {
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
    // setShowBill(true);
    setCurrentTab("bill");
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
            <div key={item.itemCode} className="flex justify-between items-start border-b py-3">
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
                  <p className="text-sm text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.description }} />
                  <p className="text-sm font-semibold">₹{item.price.toFixed(2)}</p>
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

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
        <DialogTrigger asChild>
          <Card 
            className={`w-full min-w-[350px] min-h-[150px] max-w-[350px] rounded-lg border bg-white text-gray-800 
              shadow-sm cursor-pointer transition-transform duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg
              hover:border hover:border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 flex flex-col 
              justify-between ${status === "available" ? "border-green-500" : status === "reserved" ? "border-blue-500" : "border-red-500"}`}
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
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="status">Table Status</TabsTrigger>
            <TabsTrigger value="order" disabled={status !== "occupied"}>Order Management</TabsTrigger>
            <TabsTrigger value="bill" disabled={orderItems.length === 0 || status !== "occupied"}>Bill</TabsTrigger>
            <TabsTrigger value="payment" disabled={orderItems.length === 0 || status !== "occupied"}>Payment</TabsTrigger>
          </TabsList>

            {/* Table Status Tab */}
            <TabsContent value="status" className="space-y-4">
              <ScrollArea className="max-h-[400px] p-4">
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
                        max="30"
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
              </ScrollArea>
            </TabsContent>

            {/* Order Management Tab */}
            <TabsContent value="order" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
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
                        <Button
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setSearchQuery("");
                            setActiveView("category");
                          }}
                        >
                          ×
                        </Button>
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
                  <ScrollArea className="h-72 pr-4">
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

                  <ScrollArea >
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
                                  ₹{item.price.toFixed(2)} x {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
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
                      <span>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({(TAX_RATE * 100).toFixed(0)}%):</span>
                      <span>₹{calculateTax().toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>₹{calculateTotal().toFixed(2)}</span>
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
              </ScrollArea>
            </TabsContent>

            {/* Bill Tab */}
            <TabsContent value="bill" className="space-y-4">
              <ScrollArea className="h-[400px] p-4">
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
                      <div className="text-right">₹{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({(TAX_RATE * 100).toFixed(0)}%):</span>
                    <span>₹{calculateTax().toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
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
                        <span>₹{(calculateTotal() / splitBill).toFixed(2)}</span>
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
                    onClick={() => setCurrentTab("payment")}
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <ScrollArea className="h-[400px] p-4">
                <div className="border rounded-lg p-6 max-w-2xl mx-auto">
                  <h2 className="text-center text-2xl font-bold mb-6">Payment Processing</h2>
                  
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Total Amount Due:</span>
                      <span className="text-xl font-bold">₹{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid gap-3">
                      <Label className="text-left font-semibold">Customer Information (Optional)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customerEmail">Email</Label>
                          <Input
                            id="customerEmail"
                            type="email"
                            placeholder="customer@email.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="customerPhone">Phone Number</Label>
                          <Input
                            id="customerPhone"
                            type="tel"
                            placeholder="Phone Number"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="text-left font-semibold mb-2 block">Payment Method</Label>
                      <RadioGroup value={paymentMethod} onValueChange={(value) => {
                        setPaymentMethod(value as "cash" | "card" | "upi");
                        // Reset UPI state when changing payment method
                        if (value !== "upi") {
                          setShowUpiOptions(false);
                          setPaymentMode('');
                          setUpiId('');
                          setUpiIdError('');
                          setUpiPaymentInitiated(false);
                          setShowQrCode(false);
                        }
                      }}>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start space-x-2 border p-4 rounded-md">
                            <RadioGroupItem value="cash" id="cash" />
                            <div className="grid gap-1 w-full">
                              <Label htmlFor="cash" className="font-medium">Cash</Label>
                              {paymentMethod === "cash" && (
                                <div className="mt-2 space-y-3">
                                  <div>
                                    <Label htmlFor="cashAmount">Amount Received</Label>
                                    <Input
                                      id="cashAmount"
                                      type="number"
                                      placeholder="Enter amount"
                                      value={cashAmount}
                                      onChange={(e) => setCashAmount(e.target.value)}
                                    />
                                  </div>
                                  {parseFloat(cashAmount) > 0 && (
                                    <div>
                                      <Label>Change Due</Label>
                                      <div className="p-2 bg-gray-50 border rounded">
                                        ₹{Math.max(0, parseFloat(cashAmount) - calculateTotal()).toFixed(2)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-2 border p-4 rounded-md">
                            <RadioGroupItem value="card" id="card" />
                            <div className="grid gap-1 w-full">
                              <Label htmlFor="card" className="font-medium">Card Payment</Label>
                              {paymentMethod === "card" && (
                                <div className="mt-2 space-y-3">
                                  <div>
                                    <Label htmlFor="cardType">Card Type</Label>
                                    <Select value={cardType} onValueChange={setCardType}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Card Type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="visa">Visa</SelectItem>
                                        <SelectItem value="mastercard">Mastercard</SelectItem>
                                        <SelectItem value="amex">American Express</SelectItem>
                                        <SelectItem value="rupay">RuPay</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="cardLastFour">Last 4 Digits</Label>
                                    <Input
                                      id="cardLastFour"
                                      maxLength={4}
                                      placeholder="1234"
                                      value={cardLastFour}
                                      onChange={(e) => {
                                        // Allow only numbers and limit to 4 digits
                                        const value = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                                        setCardLastFour(value);
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-2 border p-4 rounded-md">
                            <RadioGroupItem value="upi" id="upi" />
                            <div className="grid gap-1 w-full">
                              <Label htmlFor="upi" className="font-medium">UPI Payment</Label>
                              {paymentMethod === "upi" && (
                                <div className="mt-2">
                                  <Button 
                                    variant="outline" 
                                    className="w-full py-6" 
                                    onClick={() => setShowUpiOptions(true)}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <QrCode className="h-5 w-5" />
                                      <span>Select UPI Payment Method</span>
                                    </div>
                                  </Button>
                                  {upiPaymentInitiated && (
                                    <div className="flex items-center gap-2 text-green-600 mt-2">
                                      <CheckCircle className="h-4 w-4" />
                                      <span className="text-sm">Payment initiated, waiting for confirmation</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentTab("bill")}
                    >
                      Back to Bill
                    </Button>
                    <Button
                      onClick={processPayment}
                      disabled={isProcessingPayment || 
                        (paymentMethod === "cash" && (!cashAmount || parseFloat(cashAmount) < calculateTotal())) ||
                        (paymentMethod === "card" && (!cardType || !cardLastFour || cardLastFour.length !== 4)) ||
                        (paymentMethod === "upi" && (!upiId || !upiPaymentInitiated))
                      }
                    >
                      {isProcessingPayment ? "Processing..." : "Confirm Payment"}
                    </Button>
                  </div>
                </div>
              </ScrollArea>

              {/* UPI Payment Options Dialog */}
              <Dialog open={showUpiOptions} onOpenChange={setShowUpiOptions}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>UPI Payment</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <p className="text-center font-medium">Select Payment Method</p>
                    
                    <div className="flex justify-center gap-4">
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center p-4 h-auto"
                        onClick={() => {
                          setPaymentMode('qr');
                          setShowQrCode(true);
                        }}
                      >
                        <QrCode className="h-8 w-8 mb-2" />
                        <span>Scan QR Code</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="flex flex-col items-center p-4 h-auto"
                        onClick={() => setPaymentMode('upi-id')}
                      >
                        <CreditCard className="h-8 w-8 mb-2" />
                        <span>Enter UPI ID</span>
                      </Button>
                    </div>
                    
                    {paymentMode === 'qr' && showQrCode && (
                      <div className="flex flex-col items-center p-4 border rounded-lg">
                        <div className="bg-white p-4 rounded-lg mb-3">
                          {/* Using placeholder image for QR code */}
                          <div className="h-48 w-48 bg-gray-100 flex items-center justify-center">
                            <QrCode className="h-32 w-32 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-sm text-center mb-4">Scan this QR code to pay ₹{calculateTotal().toFixed(2)}</p>
                        <Button 
                          onClick={() => {
                            setUpiPaymentInitiated(true);
                            setUpiId("QR_SCAN_" + Math.random().toString(36).substring(2, 10));
                            setUpiReference("QR_" + Date.now().toString().substring(6));
                            setShowUpiOptions(false);
                          }}
                          className="w-full"
                        >
                          I've Paid
                        </Button>
                      </div>
                    )}
                    
                    {paymentMode === 'upi-id' && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <Label htmlFor="upiId">Enter your UPI ID</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="upiId" 
                              value={upiId} 
                              onChange={(e) => setUpiId(e.target.value)}
                              placeholder="yourname@bankname" 
                            />
                          </div>
                          {upiIdError && (
                            <p className="text-destructive text-sm mt-1">{upiIdError}</p>
                          )}
                        </div>
                        
                        <Button 
                          onClick={validateAndProceedUpiPayment}
                          disabled={!upiId || upiIdError !== ''}
                        >
                          Pay ₹{calculateTotal().toFixed(2)}
                        </Button>
                      </div>
                    )}
                    
                    {paymentMode === 'upi-id' && upiPaymentInitiated && (
                      <div className="flex flex-col items-center p-4 border rounded-lg mt-2">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <CheckCircle className="h-5 w-5" />
                          <span>Payment initiated</span>
                        </div>
                        <p className="text-sm text-center mb-4">Check your UPI app to approve the payment</p>
                        <Button 
                          onClick={() => {
                            setUpiReference("UPI_" + Date.now().toString().substring(6));
                            setShowUpiOptions(false);
                          }}
                          className="w-full"
                        >
                          I've Paid
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowUpiOptions(false);
                        setPaymentMode('');
                        setUpiId('');
                        setUpiIdError('');
                        setUpiPaymentInitiated(false);
                        setShowQrCode(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Payment success dialog */}
            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Payment Successful</AlertDialogTitle>
                  <AlertDialogDescription>
                    Payment has been processed successfully and the table has been marked as available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => {
                    setIsDialogOpen(false);
                    setShowSuccessDialog(false);
                  }}>
                    Close
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};