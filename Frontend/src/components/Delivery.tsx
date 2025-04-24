import { FC, useEffect, useState } from "react";
import { MapPin, Package, Check, Clock, Navigation, ShoppingBag, List, Phone, Mail, User as UserIcon, ArrowRight, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Swal from 'sweetalert2';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/Database/FirebaseConfig";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeliveryPerson {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  status: string;
  total: number;
  createdAt: any;
  estimatedDelivery?: any;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  assignedTo?: string;
  tax?: number;
  paymentMethod?: string;
  orderType: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  options?: {name: string, value: string}[];
}

const DeliveryD: FC = () => {
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const userDetails: DeliveryPerson = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        };
        setDeliveryPerson(userDetails);
        
        // After authenticating, fetch orders
        fetchOrders();
      } else {
        setDeliveryPerson(null);
        navigate("/delivery/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Function to fetch orders from Firestore
  // Function to fetch orders from Firestore
const fetchOrders = async () => {    
    try {
      setIsLoading(true);
      
      // Query orders assigned to this delivery person or available for pickup
      const ordersRef = collection(db, "Orders");
      
      // Get orders from today that are delivery type
      const today = new Date(filterDate);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // First fetch assigned orders (simplified query)
      const assignedQuery = query(
        ordersRef, 
        where("orderType", "==", "delivery"),
        // where("assignedTo", "==", deliveryPerson.uid)
      );
      
      // Then fetch available orders (simplified query)
      const availableQuery = query(
        ordersRef, 
        where("orderType", "==", "delivery"),
        where("status", "==", "ready"),
        // where("assignedTo", "==", "")
      );
      
      const [assignedSnapshot, availableSnapshot] = await Promise.all([
        getDocs(assignedQuery),
        getDocs(availableQuery)
      ]);
      
      const pending: Order[] = [];
      const inProgress: Order[] = [];
      const completed: Order[] = [];
      
      // Filter by date in the application code instead of in the query
      const isInDateRange = (timestamp: any) => {
        if (!timestamp) return false;
        const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
        return date >= today && date < tomorrow;
      };
      
      // Process assigned orders
      assignedSnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // Skip if not in date range
        if (!isInDateRange(orderData.createdAt)) return;
        
        const order: Order = {
          id: doc.id,
          orderNumber: orderData.orderNumber || doc.id.slice(0, 8).toUpperCase(),
          items: orderData.items || [],
          status: orderData.status || 'Ready for Delivery',
          total: orderData.totalAmount || 0,
          createdAt: orderData.createdAt,
          estimatedDelivery: orderData.estimatedDelivery,
          customerName: orderData.customerName || 'Customer',
          customerPhone: orderData.customerPhone || 'N/A',
          customerEmail: orderData.customerEmail || 'N/A',
          deliveryAddress: orderData.deliveryAddress || 'N/A',
          deliveryInstructions: orderData.deliveryInstructions || '',
          assignedTo: orderData.assignedTo,
          tax: orderData.tax,
          paymentMethod: orderData.paymentMethod,
          orderType: orderData.orderType || 'Delivery'
        };
        
        if (order.status === 'Out for Delivery') {
          inProgress.push(order);
        } else if (order.status === 'Delivered' || order.status === 'Completed') {
          completed.push(order);
        } else {
          pending.push(order);
        }
      });
      
      // Process available orders
      availableSnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // Skip if not in date range
        if (!isInDateRange(orderData.createdAt)) return;
        
        const order: Order = {
          id: doc.id,
          orderNumber: orderData.orderNumber || doc.id.slice(0, 8).toUpperCase(),
          items: orderData.items || [],
          status: orderData.status || 'Ready for Delivery',
          total: orderData.totalAmount || 0,
          createdAt: orderData.createdAt,
          estimatedDelivery: orderData.estimatedDelivery,
          customerName: orderData.customerName || 'Customer',
          customerPhone: orderData.customerPhone || 'N/A',
          customerEmail: orderData.customerEmail || 'N/A',
          deliveryAddress: orderData.deliveryAddress || 'N/A',
          deliveryInstructions: orderData.deliveryInstructions || '',
          assignedTo: '',
          tax: orderData.tax,
          paymentMethod: orderData.paymentMethod,
          orderType: orderData.orderType || 'Delivery'
        };
        
        pending.push(order);
      });
      
      // Sort orders by creation time (newest first)
      const sortByTime = (a: Order, b: Order) => {
        const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      };
      
      pending.sort(sortByTime);
      inProgress.sort(sortByTime);
      completed.sort(sortByTime);
      
      setPendingOrders(pending);
      setInProgressOrders(inProgress);
      setCompletedOrders(completed);
      
    } catch (error) {
      console.error("Error fetching orders:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load orders. Please try again.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to assign an order to yourself
  const assignOrder = async (orderId: string) => {
    if (!deliveryPerson?.uid) return;
    
    try {
      setUpdatingStatus(true);
      
      const orderRef = doc(db, "Orders", orderId);
      await updateDoc(orderRef, {
        assignedTo: deliveryPerson.uid,
        assignedName: deliveryPerson.displayName,
        assignedAt: serverTimestamp(),
        status: "Ready for Delivery"
      });
      
      Swal.fire({
        title: "Success",
        text: "Order assigned to you",
        icon: "success",
        timer: 1500
      });
      
      // Refresh orders
      await fetchOrders();
      
    } catch (error) {
      console.error("Error assigning order:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to assign order. Please try again.",
        icon: "error"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  // Function to update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      
      const orderRef = doc(db, "Orders", orderId);
      
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      
      if (newStatus === "Out for Delivery") {
        updateData.startDeliveryAt = serverTimestamp();
      } else if (newStatus === "Delivered") {
        updateData.deliveredAt = serverTimestamp();
        updateData.deliveryNote = deliveryNote;
      }
      
      await updateDoc(orderRef, updateData);
      
      Swal.fire({
        title: "Success",
        text: `Order status updated to ${newStatus}`,
        icon: "success",
        timer: 1500
      });
      
      // Close dialog if open
      setIsDialogOpen(false);
      setDeliveryNote("");
      
      // Refresh orders
      await fetchOrders();
      
    } catch (error) {
      console.error("Error updating order status:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to update order status. Please try again.",
        icon: "error"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };
  
  // Format date for display
  const formatDate = (dateString: any) => {
    if (!dateString) return "Not available";
    try {
      const date = dateString?.toDate?.() ? dateString.toDate() : new Date(dateString);
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      return "Not available";
    }
  };
  
  // Format timestamp for display with time
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Not available";
    try {
      const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Not available";
    }
  };
  
  // Open navigation to delivery address
  const navigateToAddress = (address: string) => {
    if (!address) return;
    
    // Check if on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank');
    } else {
      window.open(`https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
    }
  };
  
  // Call customer
  const callCustomer = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };
  
  // Show loading state
  if (isLoading && !pendingOrders.length && !inProgressOrders.length && !completedOrders.length) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Card className="bg-white">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-primary"></div>
              <p className="text-muted-foreground">Loading delivery orders...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="bg-white shadow-md">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <Package className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Delivery Dashboard</CardTitle>
                <CardDescription>Manage your deliveries and track progress</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-gray-500" />
              <Label htmlFor="filterDate">Filter by date:</Label>
            </div>
            <div className="flex gap-3">
              <Input 
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40 h-9"
              />
              <Button 
                size="sm"
                onClick={fetchOrders}
                className="h-9"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b">
            <TabsList className="px-4 h-14">
              <TabsTrigger value="pending" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <span>Pending ({pendingOrders.length})</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <Navigation className="size-4" />
                  <span>In Progress ({inProgressOrders.length})</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <Check className="size-4" />
                  <span>Completed ({completedOrders.length})</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Pending Orders Tab */}
          <TabsContent value="pending" className="p-0">
            <CardContent className="pt-6">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="size-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No pending deliveries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden border-l-4 border-l-yellow-400">
                      <CardHeader className="bg-yellow-50 py-3 px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Order #{order.orderNumber}</p>
                            <p className="text-sm">{formatTimestamp(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {order.status}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <UserIcon className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Customer</p>
                              <p className="text-base font-medium">{order.customerName}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <MapPin className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                              <p className="text-base">{order.deliveryAddress}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between pt-2 border-t text-base font-medium">
                            <span>Total:</span>
                            <span>${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 py-2 px-4 flex justify-between">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openOrderDetails(order)}
                        >
                          View Details
                        </Button>
                        
                        {order.assignedTo ? (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, "Out for Delivery")}
                            disabled={updatingStatus}
                          >
                            Start Delivery
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => assignOrder(order.id)}
                            disabled={updatingStatus}
                          >
                            Assign to Me
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
          
          {/* In Progress Tab */}
          <TabsContent value="in-progress" className="p-0">
            <CardContent className="pt-6">
              {inProgressOrders.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Navigation className="size-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No deliveries in progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inProgressOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden border-l-4 border-l-blue-400">
                      <CardHeader className="bg-blue-50 py-3 px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Order #{order.orderNumber}</p>
                            <p className="text-sm">{formatTimestamp(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {order.status}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <UserIcon className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-500">Customer</p>
                              <div className="flex justify-between items-center">
                                <p className="text-base font-medium">{order.customerName}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => callCustomer(order.customerPhone)}
                                >
                                  <Phone className="size-4 mr-1" />
                                  Call
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <MapPin className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-500">Delivery Address</p>
                              <div className="flex justify-between items-center">
                                <p className="text-base">{order.deliveryAddress}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => navigateToAddress(order.deliveryAddress)}
                                >
                                  <Navigation className="size-4 mr-1" />
                                  Navigate
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between pt-2 border-t text-base font-medium">
                            <span>Total:</span>
                            <span>${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 py-2 px-4 flex justify-between">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openOrderDetails(order)}
                        >
                          View Details
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDialogOpen(true);
                          }}
                          disabled={updatingStatus}
                        >
                          Mark Delivered
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
          
          {/* Completed Tab */}
          <TabsContent value="completed" className="p-0">
            <CardContent className="pt-6">
              {completedOrders.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Check className="size-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No completed deliveries for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden border-l-4 border-l-green-400">
                      <CardHeader className="bg-green-50 py-3 px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Order #{order.orderNumber}</p>
                            <p className="text-sm">{formatTimestamp(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {order.status}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <UserIcon className="size-4 text-gray-500" />
                              <p>{order.customerName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="size-4 text-gray-500" />
                              <p className="truncate max-w-52">{order.deliveryAddress}</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between pt-2 border-t text-base font-medium">
                            <span>Total:</span>
                            <span>${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-gray-50 py-2 px-4 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openOrderDetails(order)}
                        >
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Order Details</span>
              <DialogClose className="h-6 w-6 rounded-full hover:bg-gray-100">
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between border-b pb-2">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-medium">#{selectedOrder.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatTimestamp(selectedOrder.createdAt)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-1">Customer Details</p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserIcon className="size-4 text-gray-500" />
                        <span>Name:</span>
                      </div>
                      <span className="font-medium">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-gray-500" />
                        <span>Phone:</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-primary"
                        onClick={() => callCustomer(selectedOrder.customerPhone)}
                      >
                        {selectedOrder.customerPhone}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-gray-500" />
                        <span>Email:</span>
                      </div>
                      <span className="font-medium">{selectedOrder.customerEmail}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <p className="font-medium mb-1">Delivery Details</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-gray-500" />
                          <span>Address:</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-primary"
                          onClick={() => navigateToAddress(selectedOrder.deliveryAddress)}
                        >
                          Navigate <ArrowRight className="size-3 ml-1" />
                        </Button>
                      </div>
                      <p className="text-sm mt-1">{selectedOrder.deliveryAddress}</p>
                    </div>
                    
                    {selectedOrder.deliveryInstructions && (
                      <div className="text-sm">
                        <p className="font-medium text-gray-500">Instructions:</p>
                        <p>{selectedOrder.deliveryInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <p className="font-medium mb-1">Order Items</p>
                  <div className="max-h-48 overflow-y-auto">
                    {selectedOrder.items.map((item, index) => (
                      <div key={item.id || index} className="py-2 text-sm flex justify-between border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.options && item.options.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {item.options.map((option, i) => (
                                <div key={i}>{option.name}: {option.value}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                          <span className="font-medium">${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>
                      ${(selectedOrder.total - (selectedOrder.tax || 0)).toFixed(2)}
                    </span>
                  </div>
                  {selectedOrder.tax !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Tax:</span>
                      <span>${selectedOrder.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-medium mt-1">
                    <span>Total:</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                  
                  {selectedOrder.paymentMethod && (
                    <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                      <span>Payment Method:</span>
                      <span>{selectedOrder.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action area based on order status */}
              {selectedOrder.status === "Ready for Delivery" && selectedOrder.assignedTo === deliveryPerson?.uid && (
                <div className="border-t pt-4 flex justify-end">
                  <Button 
                    onClick={() => updateOrderStatus(selectedOrder.id, "Out for Delivery")}
                    disabled={updatingStatus}
                  >
                    Start Delivery
                  </Button>
                </div>
              )}
              
              {selectedOrder.status === "Ready for Delivery" && !selectedOrder.assignedTo && (
                <div className="border-t pt-4 flex justify-end">
                  <Button 
                    onClick={() => assignOrder(selectedOrder.id)}
                    disabled={updatingStatus}
                  >
                    Assign to Me
                  </Button>
                </div>
              )}
              
              {selectedOrder.status === "Out for Delivery" && (
                <div className="border-t pt-4">
                  <Label htmlFor="deliveryNote" className="block mb-2">
                    Delivery Notes (optional)
                  </Label>
                  <Input
                    id="deliveryNote"
                    placeholder="Any notes about the delivery..."
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateOrderStatus(selectedOrder.id, "Delivered")}
                      disabled={updatingStatus}
                    >
                      Mark as Delivered
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryD;