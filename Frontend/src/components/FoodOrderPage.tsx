import { FC, useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Utensils, MapPin, X, CreditCard, QrCode, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { db } from "../Database/FirebaseConfig";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
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

export const FoodOrderingPage: FC = () => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    orderType: 'dine-in',
    paymentMethod: 'cash',
    specialInstructions: ''
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'veg' | 'non-veg' | 'popular'>('all');
  const [showUpiOptions, setShowUpiOptions] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [paymentMode, setPaymentMode] = useState('');
  const [upiIdError, setUpiIdError] = useState('');
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false);

  const { theme } = useTheme();

  const sweetAlertOptions = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  // Calculate cart totals
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% tax
  const deliveryFee = customerInfo.orderType === 'delivery' ? 30 : 0;
  const total = subtotal + tax + deliveryFee;

  useEffect(() => {
    fetchFoodItems();
  }, []);

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
        ...sweetAlertOptions,
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
        ...sweetAlertOptions,
        title: "Missing Information",
        text: "Please provide your name and phone number.",
        icon: "warning"
      });
      return false;
    }

    if (customerInfo.phone.length !== 10 || !/^\d+$/.test(customerInfo.phone)) {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Invalid Phone Number",
        text: "Please enter a valid 10-digit phone number.",
        icon: "warning"
      });
      return false;
    }

    if (customerInfo.orderType === 'delivery' && !customerInfo.deliveryAddress) {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Missing Address",
        text: "Please provide your delivery address.",
        icon: "warning"
      });
      return false;
    }

    if (customerInfo.orderType === 'dine-in' && !customerInfo.tableNumber) {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Missing Table Number",
        text: "Please provide your table number.",
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
      };
      
      // Add transaction to Transactions collection
      await addDoc(collection(db, "Transactions"), transactionData);
        
      setOrderPlaced(true);
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
        ...sweetAlertOptions,
        title: "Payment Successful!",
        text: "Your order has been placed successfully.",
        icon: "success"
      });
      
    } catch (error) {
      console.error("Error processing payment:", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to process payment. Please try again.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };  

  // const placeOrder = async () => {
  //   if (!validateOrder()) return;
  //   if (cart.length === 0) {
  //     Swal.fire({
  //       ...sweetAlertOptions,
  //       title: "Empty Cart",
  //       text: "Please add items to your cart before placing an order.",
  //       icon: "warning"
  //     });
  //     return;
  //   }

  //   try {
  //     setIsLoading(true);
      
  //     const orderData = {
  //       customerName: customerInfo.name,
  //       customerPhone: customerInfo.phone,
  //       customerEmail: customerInfo.email || null,
  //       items: cart.map(item => ({
  //         id: item.id,
  //         name: item.name,
  //         price: item.price,
  //         quantity: item.quantity
  //       })),
  //       status: 'pending',
  //       tableNumber: customerInfo.tableNumber || null,
  //       totalAmount: total,
  //       paymentMethod: customerInfo.paymentMethod,
  //       paymentStatus: 'unpaid',
  //       specialInstructions: customerInfo.specialInstructions || null,
  //       createdAt: serverTimestamp(),
  //       updatedAt: serverTimestamp(),
  //       orderType: customerInfo.orderType,
  //       deliveryAddress: customerInfo.deliveryAddress || null,
  //     };
      
  //     await addDoc(collection(db, "Orders"), orderData);
      
  //     setOrderPlaced(true);
  //     setCart([]);
      
  //     Swal.fire({
  //       ...sweetAlertOptions,
  //       title: "Order Placed Successfully!",
  //       text: "Your order has been received and is being processed.",
  //       icon: "success"
  //     });
      
  //     setIsCheckoutOpen(false);
      
  //   } catch (error) {
  //     console.error("Error placing order:", error);
  //     Swal.fire({
  //       ...sweetAlertOptions,
  //       title: "Error!",
  //       text: "Failed to place your order. Please try again.",
  //       icon: "error"
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const placeOrder = async () => {
    if (!validateOrder()) return;
    if (cart.length === 0) {
      Swal.fire({
        ...sweetAlertOptions,
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
      
      setOrderPlaced(true);
      setCart([]);
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Order Placed Successfully!",
        text: "Your order has been received and is being processed.",
        icon: "success"
      });
      
      setIsCheckoutOpen(false);
      
    } catch (error) {
      console.error("Error placing order:", error);
      Swal.fire({
        ...sweetAlertOptions,
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
    <div className="container mx-auto px-4 py-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
      <header className="mb-8">
      <div className="relative flex items-center mb-4">
        <img src={logo} alt="logo" className="absolute left-0 w-32 h-auto" />
        <h1 className="mx-auto text-5xl font-bold text-center">Hotel Shripad</h1>
      </div>
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
          <Button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2"
          >
            <ShoppingBag className="size-4" />
            Cart ({cartItemCount})
          </Button>
        </div>
      </header>

      <main>
        {/* <Tabs defaultValue={categories[0] || "all"}>
          <TabsList className="mb-6 overflow-x-auto flex w-full">
            <TabsTrigger key='all' value='all' className="whitespace-nowrap">All</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="whitespace-nowrap">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
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
        </Tabs> */}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
                        <h4 className="font-medium">{item.name}</h4>
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
                      <span className="w-6 text-center">{item.quantity}</span>
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
              
              <div className="space-y-2 pt-2">
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
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
              
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => setIsCartOpen(false)}
                >
                  Continue Shopping
                </Button>
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                >
                  Proceed to Checkout
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      {/* <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] mb-4 pr-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={customerInfo.name} 
                  onChange={handleInputChange} 
                  placeholder="Your Name" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={customerInfo.phone} 
                  onChange={handleInputChange} 
                  placeholder="10-digit phone number" 
                  required 
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={customerInfo.email} 
                  onChange={handleInputChange} 
                  placeholder="your@email.com" 
                />
              </div>
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
                      Dine-in
                    </div>
                  </SelectItem>
                  <SelectItem value="takeaway">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="size-4" />
                      Takeaway
                    </div>
                  </SelectItem>
                  <SelectItem value="delivery">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      Delivery
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
                  placeholder="Enter your table number" 
                  required 
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
                  rows={3} 
                  required 
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={customerInfo.paymentMethod} 
                onValueChange={(value) => handleSelectChange('paymentMethod', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card on Delivery</SelectItem>
                  <SelectItem value="online">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea 
                id="specialInstructions" 
                name="specialInstructions" 
                value={customerInfo.specialInstructions || ''} 
                onChange={handleInputChange} 
                placeholder="Any allergies, preferences, or special requests?" 
                rows={3} 
              />
            </div>
            
            <Accordion type="single" collapsible>
              <AccordionItem value="order-summary">
                <AccordionTrigger>
                  Order Summary (₹{total.toFixed(2)})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.name} x {item.quantity}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t space-y-1">
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
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          </ScrollArea>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => {
                setIsCheckoutOpen(false);
                setIsCartOpen(true);
              }}
            >
              Back to Cart
            </Button>
            <Button 
              className="w-full sm:w-auto" 
              onClick={placeOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"></div>
                  Processing...
                </span>
              ) : (
                'Place Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] mb-4 pr-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={customerInfo.name} 
                  onChange={handleInputChange} 
                  placeholder="Your Name" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={customerInfo.phone} 
                  onChange={handleInputChange} 
                  placeholder="10-digit phone number" 
                  required 
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={customerInfo.email} 
                  onChange={handleInputChange} 
                  placeholder="your@email.com" 
                />
              </div>
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
                      Dine-in
                    </div>
                  </SelectItem>
                  <SelectItem value="takeaway">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="size-4" />
                      Takeaway
                    </div>
                  </SelectItem>
                  <SelectItem value="delivery">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      Delivery
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
                  placeholder="Enter your table number" 
                  required 
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
                  rows={3} 
                  required 
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={customerInfo.paymentMethod} 
                onValueChange={(value) => handleSelectChange('paymentMethod', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card on Delivery</SelectItem>
                  <SelectItem value="online">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea 
                id="specialInstructions" 
                name="specialInstructions" 
                value={customerInfo.specialInstructions || ''} 
                onChange={handleInputChange} 
                placeholder="Any allergies, preferences, or special requests?" 
                rows={3} 
              />
            </div>
            
            <Accordion type="single" collapsible>
              <AccordionItem value="order-summary">
                <AccordionTrigger>
                  Order Summary (₹{total.toFixed(2)})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.name} x {item.quantity}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t space-y-1">
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
                      <div className="flex justify-between font-bold pt-1 border-t">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          </ScrollArea>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => {
                setIsCheckoutOpen(false);
                setIsCartOpen(true);
              }}
            >
              Back to Cart
            </Button>
            
            {customerInfo.paymentMethod === 'online' ? (
              <Button 
                className="w-full sm:w-auto" 
                onClick={() => setShowUpiOptions(true)}
              >
                Proceed to Pay
              </Button>
            ) : (
              <Button 
                className="w-full sm:w-auto" 
                onClick={placeOrder}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"></div>
                    Processing...
                  </span>
                ) : (
                  'Place Order'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <QrCode className="size-8 mb-2" />
                <span>Scan QR Code</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-4 h-auto"
                onClick={() => setPaymentMode('upi-id')}
              >
                <CreditCard className="size-8 mb-2" />
                <span>Enter UPI ID</span>
              </Button>
            </div>
            
            {paymentMode === 'qr' && showQrCode && (
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <div className="bg-white p-4 rounded-lg mb-3">
                  <img src={QRImg} alt="QR Code for payment" className="w-full" />
                </div>
                <p className="text-sm text-center mb-4">Scan this QR code to pay ₹{total.toFixed(2)}</p>
                <Button 
                  onClick={() => handlePaymentConfirmation()}
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
                  Pay ₹{total.toFixed(2)}
                </Button>
              </div>
            )}
            
            {paymentMode === 'upi-id' && upiPaymentInitiated && (
              <div className="flex flex-col items-center p-4 border rounded-lg mt-2">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle className="size-5" />
                  <span>Payment initiated</span>
                </div>
                <p className="text-sm text-center mb-4">Check your UPI app to approve the payment</p>
                <Button 
                  onClick={() => handlePaymentConfirmation()}
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
    </div>
  );
};

// Helper component for food item cards
const FoodItemCard: FC<{
  item: FoodItem;
  onAddToCart: (item: FoodItem) => void;
  cartItem?: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}> = ({ item, onAddToCart, cartItem, onUpdateQuantity }) => {
  return (
    <Card className="overflow-hidden max-w-s hover:shadow-lg transition-shadow hover:scale-[95%] transition hover:cursor-pointer duration-200">
      <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <Utensils className="size-8 text-gray-400" />
        )}
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${item.isVegetarian ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <CardTitle className="text-lg">{item.name}</CardTitle>
          </div>
          {item.isPopular && (
            <Badge variant="secondary">Popular</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.description }} />
      </CardContent>
      
      <CardFooter className="flex justify-between align-center items-center">
        <p className="text-lg font-semibold">₹{item.price.toFixed(2)}</p>
        {cartItem ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="text-teal-600 border-teal-600 hover:bg-teal-50"
              onClick={() => onUpdateQuantity(item.id, cartItem.quantity - 1)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="text-teal-600 border-teal-600 hover:bg-teal-50"
              onClick={() => onUpdateQuantity(item.id, cartItem.quantity + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        ) : (
          <Button 
            className="w-1/2 text-teal-600 border-teal-600 hover:bg-teal-50"
            variant='outline'
            onClick={() => onAddToCart(item)}
          >
            Add to Cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};