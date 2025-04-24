import { FC, useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Utensils, MapPin, X, CreditCard, QrCode, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { db } from "../Database/FirebaseConfig";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import Swal from 'sweetalert2';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Navbar } from "@/components/CustomerNavbar";
import { useAuth } from "@/components/AuthProvider";
import QRImg from '@/assets/QR.png';
import logo from '@/assets/logoLandscape.png';

interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  isPopular?: boolean;
}

interface CartItem extends FoodItem {
  quantity: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  deliveryAddress?: string;
  paymentMethod: 'cash' | 'card' | 'online';
  specialInstructions?: string;
}

export const HomePage: FC = () => {
  const { user } = useAuth();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: user?.displayName || '',
    phone: '',
    email: user?.email || '',
    orderType: 'dine-in',
    paymentMethod: 'cash',
    specialInstructions: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'veg' | 'non-veg' | 'popular'>('all');
  const [showUpiOptions, setShowUpiOptions] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [paymentMode, setPaymentMode] = useState('');
  const [upiIdError, setUpiIdError] = useState('');
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false);

  // Calculate cart totals
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% tax
  const deliveryFee = customerInfo.orderType === 'delivery' ? 30 : 0;
  const total = subtotal + tax + deliveryFee;

  useEffect(() => {
    fetchFoodItems();
  }, []);

  useEffect(() => {
    // Update customer info when user data is available
    if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const fetchFoodItems = async () => {
    try {
      setIsLoading(true);
      const itemsCollection = collection(db, "Menu");
      const availableItemsQuery = query(itemsCollection, where("isAvailable", "==", true));
      const itemsSnapshot = await getDocs(availableItemsQuery);
      
      const items: FoodItem[] = [];
      const cats = new Set<string>();
      
      itemsSnapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as FoodItem;
        if (item.isAvailable) {
          items.push(item);
          cats.add(item.category);
        }
      });
      
      setFoodItems(items);
      setCategories(Array.from(cats).sort());
    } catch (error) {
      console.error("Error fetching food items:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to load menu items. Please refresh the page.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item: FoodItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const validateOrder = (): boolean => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      Swal.fire({
        title: "Missing Information",
        text: "Please provide your name and phone number.",
        icon: "warning"
      });
      return false;
    }

    if (customerInfo.phone.length !== 10 || !/^\d+$/.test(customerInfo.phone)) {
      Swal.fire({
        title: "Invalid Phone Number",
        text: "Please enter a valid 10-digit phone number.",
        icon: "warning"
      });
      return false;
    }

    if (customerInfo.orderType === 'delivery' && !customerInfo.deliveryAddress) {
      Swal.fire({
        title: "Missing Address",
        text: "Please provide your delivery address.",
        icon: "warning"
      });
      return false;
    }

    return true;
  };

  const validateUpiId = (id: string) => {
    // Basic UPI ID validation (username@provider format)
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
    return upiRegex.test(id);
  };
  
  const validateAndProceedUpiPayment = () => {
    if (!upiId) {
      setUpiIdError('UPI ID is required');
      return;
    }
    
    if (!validateUpiId(upiId)) {
      setUpiIdError('Invalid UPI ID format. Example: username@bankname');
      return;
    }
    
    setUpiIdError('');
    setUpiPaymentInitiated(true);
  };
  
  const handlePaymentConfirmation = async () => {
    try {
      setIsLoading(true);
      
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email || null,
        userId: user?.uid || null,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        status: 'pending',
        tableNumber: customerInfo.tableNumber || null,
        totalAmount: total,
        paymentMethod: 'online',
        paymentStatus: 'paid', // Set as paid since payment is confirmed
        specialInstructions: customerInfo.specialInstructions || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        orderType: customerInfo.orderType,
        deliveryAddress: customerInfo.deliveryAddress || null,
        upiId: upiId || null,
      };
      
      const orderRef = await addDoc(collection(db, "Orders"), orderData);

      // Create transaction document
      const transactionData = {
        amount: total,
        createdAt: serverTimestamp(),
        customerName: customerInfo.name,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        type: 'payment',
        orderId: orderRef.id,
        userId: user?.uid || null,
      };
      
      // Add transaction to Transactions collection
      await addDoc(collection(db, "Transactions"), transactionData);
        
      setCart([]);
      
      // Close all dialogs
      setShowUpiOptions(false);
      setIsCheckoutOpen(false);
      
      // Reset UPI states
      setPaymentMode('');
      setUpiId('');
      setUpiIdError('');
      setUpiPaymentInitiated(false);
      setShowQrCode(false);
      
      Swal.fire({
        title: "Payment Successful!",
        text: "Your order has been placed successfully.",
        icon: "success"
      });
      
    } catch (error) {
      console.error("Error processing payment:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to process payment. Please try again.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!validateOrder()) return;
    if (cart.length === 0) {
      Swal.fire({
        title: "Empty Cart",
        text: "Please add items to your cart before placing an order.",
        icon: "warning"
      });
      return;
    }
  
    try {
      setIsLoading(true);
      
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email || null,
        userId: user?.uid || null,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        status: 'pending',
        tableNumber: customerInfo.tableNumber || null,
        totalAmount: total,
        paymentMethod: customerInfo.paymentMethod,
        paymentStatus: 'unpaid', // For cash/card payments
        specialInstructions: customerInfo.specialInstructions || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        orderType: customerInfo.orderType,
        deliveryAddress: customerInfo.deliveryAddress || null,
      };
      
      await addDoc(collection(db, "Orders"), orderData);
      
      setCart([]);
      
      Swal.fire({
        title: "Order Placed Successfully!",
        text: "Your order has been received and is being processed.",
        icon: "success"
      });
      
      setIsCheckoutOpen(false);
      
    } catch (error) {
      console.error("Error placing order:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to place your order. Please try again.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'veg') {
      return matchesSearch && item.isVegetarian;
    } else if (activeFilter === 'non-veg') {
      return matchesSearch && !item.isVegetarian;
    } else if (activeFilter === 'popular') {
      return matchesSearch && item.isPopular;
    } else {
      return matchesSearch;
    }
  });

  if (isLoading && foodItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
      <Navbar cartItemCount={cartItemCount} onCartClick={() => setIsCartOpen(true)} />
      
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4">Welcome to Hotel Shripad</h1>
          <p className="text-center text-black text-lg mb-6">Order delicious food for delivery, takeaway, or dine-in</p>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Input
                type="text"
                placeholder="Search menu..."
                className="w-full p-2 pl-10 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={activeFilter === 'all' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={activeFilter === 'veg' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveFilter('veg')}
                className="flex items-center gap-1"
              >
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Veg
              </Button>
              <Button 
                variant={activeFilter === 'non-veg' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveFilter('non-veg')}
                className="flex items-center gap-1"
              >
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Non-veg
              </Button>
              <Button 
                variant={activeFilter === 'popular' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveFilter('popular')}
              >
                Popular
              </Button>
            </div>
          </div>
        </header>

        <main>
          <Tabs defaultValue="all">
            <TabsList className="mb-6 overflow-x-auto flex w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
              <TabsTrigger key='all' value='all' className="whitespace-nowrap">All</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="whitespace-nowrap">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* All category tab content */}
            <TabsContent key="all" value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <FoodItemCard 
                    key={item.id} 
                    item={item} 
                    onAddToCart={addToCart} 
                    cartItem={cart.find(cartItem => cartItem.id === item.id)}
                    onUpdateQuantity={updateQuantity}
                  />
                ))}
              </div>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items found with the current filters.</p>
                </div>
              )}
            </TabsContent>
            
            {/* Individual category tab contents */}
            {categories.map(category => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredItems
                    .filter(item => item.category === category)
                    .map(item => (
                      <FoodItemCard 
                        key={item.id} 
                        item={item} 
                        onAddToCart={addToCart} 
                        cartItem={cart.find(cartItem => cartItem.id === item.id)}
                        onUpdateQuantity={updateQuantity}
                      />
                    ))}
                </div>
                
                {filteredItems.filter(item => item.category === category).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No items found in this category with the current filters.</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </main>

        {/* Cart Dialog */}
        <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-black">
                <ShoppingBag className="size-4" />
                Your Order
              </DialogTitle>
            </DialogHeader>
            
            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag className="size-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Your cart is empty</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setIsCartOpen(false)}
                >
                  Browse Menu
                </Button>
              </div>
            ) : (
              <>
                <div className="max-h-[50vh] overflow-y-auto space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${item.isVegetarian ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <h4 className="font-medium text-black">{item.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500">₹{item.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="size-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-black">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="size-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-500"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 pt-2 text-black">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (5%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCartOpen(false)}>
                    Continue Shopping
                  </Button>
                  <Button onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}>
                    Proceed to Checkout
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Checkout Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">Checkout</DialogTitle>
            </DialogHeader>
            
            <div className="max-h-[70vh] overflow-y-auto">
              <Tabs defaultValue="details">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                  <TabsTrigger value="review">Review</TabsTrigger>
                </TabsList>
                
                {/* Customer Details Tab */}
                <TabsContent value="details">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={customerInfo.name} 
                        onChange={handleInputChange} 
                        placeholder="Full Name" 
                        required 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        value={customerInfo.phone} 
                        onChange={handleInputChange} 
                        placeholder="10-digit mobile number" 
                        required 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        value={customerInfo.email} 
                        onChange={handleInputChange} 
                        placeholder="email@example.com" 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="orderType">Order Type</Label>
                      <Select 
                        value={customerInfo.orderType} 
                        onValueChange={(value) => handleSelectChange('orderType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select order type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dine-in">
                            <div className="flex items-center gap-2">
                              <Utensils className="size-4" />
                              <span>Dine-in</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="takeaway">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="size-4" />
                              <span>Takeaway</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="delivery">
                            <div className="flex items-center gap-2">
                              <MapPin className="size-4" />
                              <span>Delivery</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {customerInfo.orderType === 'dine-in' && (
                      <div>
                        <Label htmlFor="tableNumber">Table Number</Label>
                        <Input 
                          id="tableNumber" 
                          name="tableNumber" 
                          value={customerInfo.tableNumber || ''} 
                          onChange={handleInputChange} 
                          placeholder="Enter table number" 
                        />
                      </div>
                    )}
                    
                    {customerInfo.orderType === 'delivery' && (
                      <div>
                        <Label htmlFor="deliveryAddress">Delivery Address</Label>
                        <Textarea 
                          id="deliveryAddress" 
                          name="deliveryAddress" 
                          value={customerInfo.deliveryAddress || ''} 
                          onChange={handleInputChange} 
                          placeholder="Enter your full delivery address" 
                          className="min-h-20" 
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
                      <Textarea 
                        id="specialInstructions" 
                        name="specialInstructions" 
                        value={customerInfo.specialInstructions || ''} 
                        onChange={handleInputChange} 
                        placeholder="Any special requests, allergies, or preferences" 
                        className="min-h-20" 
                      />
                    </div>
                  </div>
                </TabsContent>
                
                {/* Payment Tab */}
                <TabsContent value="payment">
                  <div className="space-y-4">
                    <Label>Payment Method</Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div 
                        className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${customerInfo.paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/30'}`}
                        onClick={() => handleSelectChange('paymentMethod', 'cash')}
                      >
                        <div className="size-10 flex items-center justify-center rounded-full bg-green-100 mb-2">
                          <span className="text-xl">💵</span>
                        </div>
                        <span className="text-sm font-medium text-black">Cash</span>
                        <span className="text-xs text-gray-500">Pay at delivery</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${customerInfo.paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/30'}`}
                        onClick={() => handleSelectChange('paymentMethod', 'card')}
                      >
                        <div className="size-10 flex items-center justify-center rounded-full bg-blue-100 mb-2">
                          <CreditCard className="size-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-black">Card</span>
                        <span className="text-xs text-gray-500">Pay with card</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${customerInfo.paymentMethod === 'online' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/30'}`}
                        onClick={() => {
                          handleSelectChange('paymentMethod', 'online');
                          setShowUpiOptions(true);
                        }}
                      >
                        <div className="size-10 flex items-center justify-center rounded-full bg-purple-100 mb-2">
                          <QrCode className="size-5 text-purple-500" />
                        </div>
                        <span className="text-sm font-medium text-black">UPI</span>
                        <span className="text-xs text-gray-500">Pay online</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Review Tab */}
                <TabsContent value="review">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-2 text-black">Order Summary</h4>
                      <ScrollArea className="max-h-40 pr-3 mb-2">
                        {cart.map(item => (
                          <div key={item.id} className="flex justify-between items-center py-1.5 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${item.isVegetarian ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className="text-black">{item.name} × {item.quantity}</span>
                            </div>
                            <span className="font-medium text-black">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </ScrollArea>
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-black">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Tax (5%)</span>
                          <span className="text-black">₹{tax.toFixed(2)}</span>
                        </div>
                        {deliveryFee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Delivery Fee</span>
                            <span className="text-black">₹{deliveryFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium text-black pt-2 mt-2 border-t">
                          <span>Total</span>
                          <span>₹{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-2 text-black">Customer Details</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Name</span>
                          <span className="text-black">{customerInfo.name || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone</span>
                          <span className="text-black">{customerInfo.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email</span>
                          <span className="text-black">{customerInfo.email || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Order Type</span>
                          <span className="text-black">
                            {customerInfo.orderType === 'dine-in' && 'Dine-in'}
                            {customerInfo.orderType === 'takeaway' && 'Takeaway'}
                            {customerInfo.orderType === 'delivery' && 'Delivery'}
                          </span>
                        </div>
                        
                        {customerInfo.tableNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Table Number</span>
                            <span className="text-black">{customerInfo.tableNumber}</span>
                          </div>
                        )}
                        
                        {customerInfo.deliveryAddress && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Address</span>
                            <span className="text-black text-right max-w-[60%]">{customerInfo.deliveryAddress}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment</span>
                          <span className="text-black">
                            {customerInfo.paymentMethod === 'cash' && 'Cash'}
                            {customerInfo.paymentMethod === 'card' && 'Card'}
                            {customerInfo.paymentMethod === 'online' && 'UPI/Online'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {customerInfo.specialInstructions && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-2 text-black">Special Instructions</h4>
                        <p className="text-sm text-black">{customerInfo.specialInstructions}</p>
                      </div>
                    )}
                    
                    <div className="pt-4">
                      <Button 
                        className="w-full" 
                        onClick={customerInfo.paymentMethod === 'online' ? () => setShowUpiOptions(true) : placeOrder}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <>
                            {customerInfo.paymentMethod === 'online' ? 'Pay Now' : 'Place Order'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* UPI Payment Dialog */}
        <Dialog open={showUpiOptions} onOpenChange={setShowUpiOptions}>
          <DialogContent className="sm:max-w-[400px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-semibold text-black">
                Payment Options
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {!paymentMode ? (
                <>
                  <div className="text-center text-sm text-gray-500 mb-4">
                    Choose a payment method to proceed
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      className="flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-primary transition-all"
                      onClick={() => setPaymentMode('upi')}
                    >
                      <div className="size-12 flex items-center justify-center rounded-full bg-blue-100 mb-2">
                        <span className="text-xl">📱</span>
                      </div>
                      <span className="text-sm font-medium text-black">UPI ID</span>
                      <span className="text-xs text-gray-500">Pay with UPI ID</span>
                    </div>
                    
                    <div 
                      className="flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-primary transition-all"
                      onClick={() => {
                        setPaymentMode('qr');
                        setShowQrCode(true);
                      }}
                    >
                      <div className="size-12 flex items-center justify-center rounded-full bg-purple-100 mb-2">
                        <QrCode className="size-6 text-purple-500" />
                      </div>
                      <span className="text-sm font-medium text-black">QR Code</span>
                      <span className="text-xs text-gray-500">Scan & Pay</span>
                    </div>
                  </div>
                </>
              ) : paymentMode === 'upi' ? (
                !upiPaymentInitiated ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-500">Enter your UPI ID to proceed</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input 
                        id="upiId" 
                        value={upiId} 
                        onChange={(e) => setUpiId(e.target.value)} 
                        placeholder="e.g. yourname@upi" 
                        className={upiIdError ? "border-red-500" : ""}
                      />
                      {upiIdError && <p className="text-xs text-red-500 mt-1">{upiIdError}</p>}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <img src={logo} alt="Logo" className="h-10" />
                      <div className="text-right">
                        <p className="text-sm font-medium text-black">Amount</p>
                        <p className="text-lg font-bold text-primary">₹{total.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        className="w-full" 
                        onClick={validateAndProceedUpiPayment}
                      >
                        Proceed
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <CheckCircle className="size-12 text-green-500 mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-black">Payment Initiated!</h3>
                      <p className="text-sm text-gray-500">
                        A payment request has been sent to your UPI ID.
                        Please complete the payment in your UPI app.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Amount</span>
                        <span className="font-medium text-black">₹{total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">UPI ID</span>
                        <span className="font-medium text-black">{upiId}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        className="w-full" 
                        onClick={handlePaymentConfirmation}
                      >
                        I've completed the payment
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">Scan the QR code to pay</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <img src={QRImg} alt="Payment QR Code" className="h-48 w-48 object-contain" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <img src={logo} alt="Logo" className="h-10" />
                    <div className="text-right">
                      <p className="text-sm font-medium text-black">Amount</p>
                      <p className="text-lg font-bold text-primary">₹{total.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full" 
                      onClick={handlePaymentConfirmation}
                    >
                      I've completed the payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Food Item Card Component
interface FoodItemCardProps {
  item: FoodItem;
  onAddToCart: (item: FoodItem) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  cartItem?: CartItem;
}

const FoodItemCard: FC<FoodItemCardProps> = ({ item, onAddToCart, onUpdateQuantity, cartItem }) => {
  const { name, description, price, image, isVegetarian, isPopular } = item;
  
  return (
    <Card className="overflow-hidden border border-gray-200 transition-all hover:shadow-md bg-white">
      <div className="relative">
        <div className="h-40 w-full bg-gray-100 flex items-center justify-center">
          {image ? (
            <img 
              src={image} 
              alt={name} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="text-2xl">🍽️</div>
          )}
        </div>
        
        {isVegetarian && (
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Veg
            </Badge>
          </div>
        )}
        
        {isPopular && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-orange-500">
              <span className="mr-1">⭐</span>
              Popular
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1 text-black">{name}</h3>
        <p className="text-gray-500 text-sm line-clamp-2 h-10">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-black">₹{price.toFixed(2)}</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        {cartItem ? (
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="outline" 
              size="icon" 
              className="size-8"
              onClick={() => onUpdateQuantity(item.id, cartItem.quantity - 1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="font-medium text-black">{cartItem.quantity}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="size-8"
              onClick={() => onUpdateQuantity(item.id, cartItem.quantity + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full" 
            onClick={() => onAddToCart(item)}
          >
            Add to Cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};