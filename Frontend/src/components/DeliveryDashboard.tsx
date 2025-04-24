import { FC, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../Database/FirebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { isDeliveryPerson } from '@/Database/DeliverySecurityService';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Clock, Check, LogOut, User, PhoneCall, Navigation } from "lucide-react";

// Define the order type
interface Order {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  orderTime: Timestamp;
  estimatedDeliveryTime: Timestamp | null;
  status: 'preparing' | 'ready' | 'out-for-delivery' | 'delivered' | 'cancelled';
  paymentMethod: string;
  assignedTo: string | null;
}

export const DeliveryDashboard: FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [currentTab, setCurrentTab] = useState("assigned");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  
  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isDelivery = await isDeliveryPerson(user.email);
        if (isDelivery) {
          setCurrentUser(user);
        } else {
          // Redirect non-delivery users
          await auth.signOut();
          navigate('/delivery/login');
        }
      } else {
        navigate('/delivery/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch orders
  useEffect(() => {
    if (!currentUser) return;

    const fetchOrders = () => {
      // Query for orders assigned to this delivery person
      const assignedOrdersQuery = query(
        collection(db, 'orders'),
        where('assignedTo', '==', currentUser.email),
        where('status', 'in', ['ready', 'out-for-delivery']),
        orderBy('orderTime', 'desc')
      );

      // Query for available orders that aren't assigned yet
      const availableOrdersQuery = query(
        collection(db, 'orders'),
        where('status', '==', 'ready'),
        where('assignedTo', '==', null),
        orderBy('orderTime', 'desc')
      );

      // Listen for assigned orders
      const unsubscribeAssigned = onSnapshot(assignedOrdersQuery, (snapshot) => {
        const assignedOrdersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        
        setOrders(prevOrders => {
          // Combine with available orders, removing duplicates
          const availableOrders = prevOrders.filter(order => 
            order.assignedTo === null && order.status === 'ready'
          );
          return [...assignedOrdersList, ...availableOrders];
        });
      });

      // Listen for available orders
      const unsubscribeAvailable = onSnapshot(availableOrdersQuery, (snapshot) => {
        const availableOrdersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        
        setOrders(prevOrders => {
          // Combine with assigned orders, removing duplicates
          const assignedOrders = prevOrders.filter(order => 
            order.assignedTo === currentUser.email
          );
          return [...assignedOrders, ...availableOrdersList];
        });
      });

      return () => {
        unsubscribeAssigned();
        unsubscribeAvailable();
      };
    };

    const unsubscribe = fetchOrders();
    return () => unsubscribe();
  }, [currentUser]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/delivery/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Handle accepting an order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        assignedTo: currentUser.email,
        status: 'out-for-delivery',
        estimatedDeliveryTime: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)) // 30 min from now
      });
    } catch (error) {
      console.error("Error accepting order:", error);
    }
  };

  // Handle completing an order
  const handleCompleteDelivery = async () => {
    if (!selectedOrder) return;
    
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveryNote: deliveryNote,
        deliveredAt: Timestamp.now()
      });
      setShowDeliveryDialog(false);
      setDeliveryNote("");
    } catch (error) {
      console.error("Error completing delivery:", error);
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'Not set';
    return timestamp.toDate().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex justify-between items-center bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Delivery Dashboard</h1>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Active
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" alt={currentUser?.email} />
                  <AvatarFallback>
                    {currentUser?.email?.charAt(0).toUpperCase() || 'D'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-50 overflow-auto">
        <Tabs defaultValue="assigned" className="w-full" onValueChange={setCurrentTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="assigned">My Deliveries</TabsTrigger>
            <TabsTrigger value="available">Available Orders</TabsTrigger>
          </TabsList>
          
          {/* Assigned orders tab */}
          <TabsContent value="assigned" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Orders Assigned to You</h2>
            
            {orders.filter(order => order.assignedTo === currentUser.email).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No deliveries assigned to you yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders
                  .filter(order => order.assignedTo === currentUser.email)
                  .map(order => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{order.customerName}</CardTitle>
                            <CardDescription className="mt-1">{order.items.length} items · ${order.totalAmount.toFixed(2)}</CardDescription>
                          </div>
                          <Badge variant={order.status === 'out-for-delivery' ? 'secondary' : 'outline'}>
                            {order.status === 'out-for-delivery' ? 'In Progress' : 'Ready'}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pb-2">
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          <p className="text-sm">{order.customerAddress}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">Estimated delivery: {formatTime(order.estimatedDeliveryTime)}</p>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between pt-2">
                        <Button variant="ghost" className="text-sm p-0 h-auto" 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}>
                          View Details
                        </Button>
                        
                        <Button onClick={() => {
                          setSelectedOrder(order);
                          setShowDeliveryDialog(true);
                        }}>
                          Complete Delivery
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                }
              </div>
            )}
          </TabsContent>
          
          {/* Available orders tab */}
          <TabsContent value="available" className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Available Orders</h2>
            
            {orders.filter(order => order.assignedTo === null && order.status === 'ready').length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No orders available for pickup at the moment.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders
                  .filter(order => order.assignedTo === null && order.status === 'ready')
                  .map(order => (
                    <Card key={order.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{order.customerName}</CardTitle>
                            <CardDescription className="mt-1">{order.items.length} items · ${order.totalAmount.toFixed(2)}</CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Ready for Pickup
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pb-2">
                        <div className="flex items-start gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          <p className="text-sm">{order.customerAddress}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">Ordered: {formatTime(order.orderTime)}</p>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between pt-2">
                        <Button variant="ghost" className="text-sm p-0 h-auto"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}>
                          View Details
                        </Button>
                        
                        <Button onClick={() => handleAcceptOrder(order.id)}>
                          Accept Delivery
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                }
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id?.substring(0, 6)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <h3 className="font-medium">Customer Information</h3>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{selectedOrder.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedOrder.customerAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    <span>{selectedOrder.customerPhone}</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Order Items</h3>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p>${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="flex justify-between font-medium border-t pt-4">
                  <span>Total Amount</span>
                  <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Payment Method</span>
                  <span>{selectedOrder.paymentMethod}</span>
                </div>
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowOrderDetails(false)}>Close</Button>
                
                <Button onClick={() => {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOrder.customerAddress)}`, '_blank');
                }}>
                  <Navigation className="mr-2 h-4 w-4" />
                  Navigate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
            <DialogDescription>
              Confirm the order has been delivered to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="delivery-note">Delivery Notes (Optional)</Label>
              <Input
                id="delivery-note"
                placeholder="Add any notes about the delivery..."
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteDelivery}>
              <Check className="mr-2 h-4 w-4" />
              Mark as Delivered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};