import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Clock, Search, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader1 from "./Loader";
import { auth, db } from "../Database/FirebaseConfig";
import { Sidebar } from "./Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import { Header } from "./Header";
import { CreateDineInOrder } from "@/components/DineInOrders";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  tableNumber?: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'online';
  paymentStatus: 'paid' | 'unpaid';
  specialInstructions?: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  deliveryAddress?: string;
}

export const ManageOrders: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { theme } = useTheme();

  const sweetAlertOptions = useMemo(() => ({
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  }), [theme]);

  useEffect(() => {
      document.title = 'Manage Orders - Hotel Shripad';
    }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/admin/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const ordersCollection = collection(db, "Orders");
      const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersList = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      
      setOrders(ordersList);
    } catch (error) {
      console.error("Error fetching orders: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to fetch orders. Please try again.",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [sweetAlertOptions]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      setLoading(true);
      const orderRef = doc(db, "Orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Success!",
        text: `Order status updated to ${newStatus}!`,
        icon: "success"
      });
      
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to update order status. Please try again.",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsDialogOpen(true);
  };

  const getStatusBadgeColors = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case 'preparing':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case 'ready':
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case 'completed':
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case 'cancelled':
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="size-4 mr-1" />;
      case 'preparing':
        return <ShoppingBag className="size-4 mr-1" />;
      case 'ready':
        return <Check className="size-4 mr-1" />;
      case 'completed':
        return <Check className="size-4 mr-1" />;
      case 'cancelled':
        return <X className="size-4 mr-1" />;
      default:
        return null;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date: ", error);
      return "Invalid date";
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    const matchesType = orderTypeFilter ? order.orderType === orderTypeFilter : true;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter(null);
    setOrderTypeFilter(null);
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      <Sidebar user={user} activePage="order-manager" />
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h1 className="text-2xl text-primary font-bold">Order Manager</h1>
            <div className="flex gap-2">
              <CreateDineInOrder />
              <Button variant="outline" onClick={fetchOrders}>
                Refresh Orders
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by name, phone or order ID"
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                {/* {orderType === 'delivery' && (<SelectItem value="cancelled">Cancelled</SelectItem>) } */}
              </SelectContent>
            </Select>
            
            <Select value={orderTypeFilter || "all"} onValueChange={(value) => setOrderTypeFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dine-in">Dine-in</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
            
            {(searchTerm || statusFilter || orderTypeFilter) && (
              <Button variant="ghost" onClick={handleClearFilters} className="whitespace-nowrap">
                Clear Filters
              </Button>
            )}
          </div>

          {/* Orders List */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="active">Active Orders</TabsTrigger>
              <TabsTrigger value="completed">Completed & Cancelled</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <OrdersTable 
                orders={filteredOrders} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                updateOrderStatus={updateOrderStatus}
                getStatusBadgeColors={getStatusBadgeColors}
                getStatusIcon={getStatusIcon}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <OrdersTable 
                orders={filteredOrders.filter(order => ['pending', 'preparing', 'ready'].includes(order.status))} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                updateOrderStatus={updateOrderStatus}
                getStatusBadgeColors={getStatusBadgeColors}
                getStatusIcon={getStatusIcon}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <OrdersTable 
                orders={filteredOrders.filter(order => ['completed', 'cancelled'].includes(order.status))} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                updateOrderStatus={updateOrderStatus}
                getStatusBadgeColors={getStatusBadgeColors}
                getStatusIcon={getStatusIcon}
                formatDate={formatDate}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Order #{selectedOrder.id.slice(-6)}</h3>
                  <p className="text-sm text-gray-500">
                    Placed on {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
                
                <div className="flex items-center">
                  <Badge className={getStatusBadgeColors(selectedOrder.status)}>
                    {getStatusIcon(selectedOrder.status)}
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="ml-2">
                        Update Status <ChevronDown className="ml-1 size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'pending')}>
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}>
                        Preparing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}>
                        Ready
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}>
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}>
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p><span className="font-medium">Name:</span> {selectedOrder.customerName}</p>
                    <p><span className="font-medium">Phone:</span> {selectedOrder.customerPhone}</p>
                    {selectedOrder.customerEmail && (
                      <p><span className="font-medium">Email:</span> {selectedOrder.customerEmail}</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p>
                      <span className="font-medium">Type:</span> 
                      {selectedOrder.orderType.charAt(0).toUpperCase() + selectedOrder.orderType.slice(1)}
                    </p>
                    {selectedOrder.tableNumber && (
                      <p><span className="font-medium">Table:</span> {selectedOrder.tableNumber}</p>
                    )}
                    {selectedOrder.deliveryAddress && (
                      <p><span className="font-medium">Delivery Address:</span> {selectedOrder.deliveryAddress}</p>
                    )}
                    <p>
                      <span className="font-medium">Payment:</span> 
                      {selectedOrder.paymentMethod.charAt(0).toUpperCase() + selectedOrder.paymentMethod.slice(1)} 
                      ({selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'})
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md divide-y">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="p-3 flex justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="font-semibold">Total</p>
                  <p className="font-semibold">₹{selectedOrder.totalAmount.toFixed(2)}</p>
                </CardFooter>
              </Card>
              
              {selectedOrder.specialInstructions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Special Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedOrder.specialInstructions}</p>
                  </CardContent>
                </Card>
              )}
              
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for orders table
const OrdersTable: FC<{
  orders: Order[];
  loading: boolean;
  onViewDetails: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getStatusBadgeColors: (status: Order['status']) => string;
  getStatusIcon: (status: Order['status']) => JSX.Element | null;
  formatDate: (timestamp: any) => string;
}> = ({ 
  orders, 
  loading, 
  onViewDetails, 
  updateOrderStatus,
  getStatusBadgeColors,
  getStatusIcon,
  formatDate
}) => {
  if (loading) {
    return (
      <div className="w-full flex justify-center p-12">
        <Loader1 />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <p className="text-lg font-medium text-gray-600">No orders found</p>
        <p className="text-gray-500">Try changing your filters or search term</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left">Order ID</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">#{order.id.slice(-6)}</td>
              <td className="px-4 py-3">
                {order.customerName}<br />
                <span className="text-sm text-gray-500">{order.customerPhone}</span>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">
                  {order.orderType === 'dine-in' && 'Dine-in'}
                  {order.orderType === 'takeaway' && 'Takeaway'}
                  {order.orderType === 'delivery' && 'Delivery'}
                </Badge>
              </td>
              <td className="px-4 py-3">₹{order.totalAmount.toFixed(2)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(order.createdAt)}</td>
              <td className="px-4 py-3">
                <Badge className={getStatusBadgeColors(order.status)}>
                  {getStatusIcon(order.status)}
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetails(order)}>
                    Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Status <ChevronDown className="ml-1 size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'pending')}>
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>
                        Mark as Preparing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready')}>
                        Mark as Ready
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'completed')}>
                        Mark as Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                        Mark as Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// import { FC, useEffect, useState, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { Check, ChevronDown, Clock, Search, ShoppingBag, X } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import Loader1 from "./Loader";
// import { auth, db } from "../Database/FirebaseConfig";
// import { Sidebar } from "./Sidebar";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
// import { Label } from "@radix-ui/react-label";
// import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
// import Swal from 'sweetalert2';
// import { useTheme } from './theme-provider';
// import { Header } from "./Header";
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
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// interface User {
//   uid: string;
//   email: string | null;
//   displayName: string | null;
//   photoURL: string | null;
// }

// interface OrderItem {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// interface Order {
//   id: string;
//   customerName: string;
//   customerPhone: string;
//   customerEmail?: string;
//   items: OrderItem[];
//   status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
//   tableNumber?: string;
//   totalAmount: number;
//   paymentMethod: 'cash' | 'card' | 'online';
//   paymentStatus: 'paid' | 'unpaid';
//   specialInstructions?: string;
//   createdAt: any; // Firestore timestamp
//   updatedAt: any; // Firestore timestamp
//   orderType: 'dine-in' | 'takeaway' | 'delivery';
//   deliveryAddress?: string;
// }

// export const ManageOrders: FC = () => {
//   const [user, setUser] = useState<User | null>(null);
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState<string | null>(null);
//   const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
//   const navigate = useNavigate();

//   const { theme } = useTheme();

//   const sweetAlertOptions = useMemo(() => ({
//     background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
//     color: theme === "dark" ? '#fff' : '#000',
//     confirmButtonText: 'OK',
//     confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
//     cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
//   }), [theme]);

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((currentUser) => {
//       if (currentUser) {
//         setUser(currentUser);
//       } else {
//         navigate("/admin/login");
//       }
//     });
//     return () => unsubscribe();
//   }, [navigate]);

//   const fetchOrders = useCallback(async () => {
//     try {
//       setLoading(true);
//       const ordersCollection = collection(db, "Orders");
//       const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
      
//       const ordersSnapshot = await getDocs(ordersQuery);
//       const ordersList = ordersSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       })) as Order[];
      
//       setOrders(ordersList);
//     } catch (error) {
//       console.error("Error fetching orders: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to fetch orders. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, [sweetAlertOptions]);

//   useEffect(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
//     try {
//       setLoading(true);
//       const orderRef = doc(db, "Orders", orderId);
//       await updateDoc(orderRef, {
//         status: newStatus,
//         updatedAt: new Date()
//       });
      
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Success!",
//         text: `Order status updated to ${newStatus}!`,
//         icon: "success"
//       });
      
//       fetchOrders();
//     } catch (error) {
//       console.error("Error updating order status: ", error);
//       Swal.fire({
//         ...sweetAlertOptions,
//         title: "Error!",
//         text: "Failed to update order status. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleViewDetails = (order: Order) => {
//     setSelectedOrder(order);
//     setIsDetailsDialogOpen(true);
//   };

//   const getStatusBadgeColors = (status: Order['status']) => {
//     switch (status) {
//       case 'pending':
//         return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
//       case 'preparing':
//         return "bg-blue-100 text-blue-800 hover:bg-blue-200";
//       case 'ready':
//         return "bg-green-100 text-green-800 hover:bg-green-200";
//       case 'completed':
//         return "bg-gray-100 text-gray-800 hover:bg-gray-200";
//       case 'cancelled':
//         return "bg-red-100 text-red-800 hover:bg-red-200";
//       default:
//         return "bg-gray-100 text-gray-800 hover:bg-gray-200";
//     }
//   };

//   const getStatusIcon = (status: Order['status']) => {
//     switch (status) {
//       case 'pending':
//         return <Clock className="size-4 mr-1" />;
//       case 'preparing':
//         return <ShoppingBag className="size-4 mr-1" />;
//       case 'ready':
//         return <Check className="size-4 mr-1" />;
//       case 'completed':
//         return <Check className="size-4 mr-1" />;
//       case 'cancelled':
//         return <X className="size-4 mr-1" />;
//       default:
//         return null;
//     }
//   };

//   const formatDate = (timestamp: any) => {
//     if (!timestamp) return "N/A";
    
//     try {
//       const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
//       return date.toLocaleString('en-US', {
//         day: 'numeric',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     } catch (error) {
//       console.error("Error formatting date: ", error);
//       return "Invalid date";
//     }
//   };

//   const filteredOrders = orders.filter(order => {
//     const matchesSearch = 
//       order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       order.customerPhone.includes(searchTerm);
    
//     const matchesStatus = statusFilter ? order.status === statusFilter : true;
//     const matchesType = orderTypeFilter ? order.orderType === orderTypeFilter : true;
    
//     return matchesSearch && matchesStatus && matchesType;
//   });

//   const handleClearFilters = () => {
//     setSearchTerm("");
//     setStatusFilter(null);
//     setOrderTypeFilter(null);
//   };

//   return (
//     <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
//       <Sidebar user={user} activePage="order-manager" />
//       <div className="flex flex-col h-screen">
//         <Header />
//         <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
//             <h1 className="text-2xl text-primary font-bold">Order Management</h1>
//             <Button variant="outline" onClick={fetchOrders}>
//               Refresh Orders
//             </Button>
//           </div>

//           {/* Search and Filters */}
//           <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
//             <div className="relative w-full md:max-w-sm">
//               <Search className="absolute left-2.5 top-2.5 size-4 text-gray-500" />
//               <Input
//                 type="text"
//                 placeholder="Search by name, phone or order ID"
//                 className="pl-8 w-full"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
            
//             <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
//               <SelectTrigger className="w-full md:w-[180px]">
//                 <SelectValue placeholder="Filter by status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Statuses</SelectItem>
//                 <SelectItem value="pending">Pending</SelectItem>
//                 <SelectItem value="preparing">Preparing</SelectItem>
//                 <SelectItem value="ready">Ready</SelectItem>
//                 <SelectItem value="completed">Completed</SelectItem>
//                 <SelectItem value="cancelled">Cancelled</SelectItem>
//               </SelectContent>
//             </Select>
            
//             <Select value={orderTypeFilter || "all"} onValueChange={(value) => setOrderTypeFilter(value === "all" ? null : value)}>
//               <SelectTrigger className="w-full md:w-[180px]">
//                 <SelectValue placeholder="Filter by type" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Types</SelectItem>
//                 <SelectItem value="dine-in">Dine-in</SelectItem>
//                 <SelectItem value="takeaway">Takeaway</SelectItem>
//                 <SelectItem value="delivery">Delivery</SelectItem>
//               </SelectContent>
//             </Select>
            
//             {(searchTerm || statusFilter || orderTypeFilter) && (
//               <Button variant="ghost" onClick={handleClearFilters} className="whitespace-nowrap">
//                 Clear Filters
//               </Button>
//             )}
//           </div>

//           {/* Orders List */}
//           <Tabs defaultValue="all">
//             <TabsList>
//               <TabsTrigger value="all">All Orders</TabsTrigger>
//               <TabsTrigger value="active">Active Orders</TabsTrigger>
//               <TabsTrigger value="completed">Completed & Cancelled</TabsTrigger>
//             </TabsList>
//             <TabsContent value="all" className="mt-4">
//               <OrdersTable 
//                 orders={filteredOrders} 
//                 loading={loading} 
//                 onViewDetails={handleViewDetails}
//                 updateOrderStatus={updateOrderStatus}
//                 getStatusBadgeColors={getStatusBadgeColors}
//                 getStatusIcon={getStatusIcon}
//                 formatDate={formatDate}
//               />
//             </TabsContent>
//             <TabsContent value="active" className="mt-4">
//               <OrdersTable 
//                 orders={filteredOrders.filter(order => ['pending', 'preparing', 'ready'].includes(order.status))} 
//                 loading={loading} 
//                 onViewDetails={handleViewDetails}
//                 updateOrderStatus={updateOrderStatus}
//                 getStatusBadgeColors={getStatusBadgeColors}
//                 getStatusIcon={getStatusIcon}
//                 formatDate={formatDate}
//               />
//             </TabsContent>
//             <TabsContent value="completed" className="mt-4">
//               <OrdersTable 
//                 orders={filteredOrders.filter(order => ['completed', 'cancelled'].includes(order.status))} 
//                 loading={loading} 
//                 onViewDetails={handleViewDetails}
//                 updateOrderStatus={updateOrderStatus}
//                 getStatusBadgeColors={getStatusBadgeColors}
//                 getStatusIcon={getStatusIcon}
//                 formatDate={formatDate}
//               />
//             </TabsContent>
//           </Tabs>
//         </main>
//       </div>

//       {/* Order Details Dialog */}
//       <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
//         <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>Order Details</DialogTitle>
//           </DialogHeader>
          
//           {selectedOrder && (
//             <div className="space-y-4">
//               <div className="flex flex-col md:flex-row justify-between gap-4">
//                 <div>
//                   <h3 className="text-lg font-semibold">Order #{selectedOrder.id.slice(-6)}</h3>
//                   <p className="text-sm text-gray-500">
//                     Placed on {formatDate(selectedOrder.createdAt)}
//                   </p>
//                 </div>
                
//                 <div className="flex items-center">
//                   <Badge className={getStatusBadgeColors(selectedOrder.status)}>
//                     {getStatusIcon(selectedOrder.status)}
//                     {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
//                   </Badge>
                  
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="ghost" size="sm" className="ml-2">
//                         Update Status <ChevronDown className="ml-1 size-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent align="end">
//                       <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'pending')}>
//                         Pending
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}>
//                         Preparing
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}>
//                         Ready
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}>
//                         Completed
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}>
//                         Cancelled
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="text-base">Customer Information</CardTitle>
//                   </CardHeader>
//                   <CardContent className="space-y-1">
//                     <p><span className="font-medium">Name:</span> {selectedOrder.customerName}</p>
//                     <p><span className="font-medium">Phone:</span> {selectedOrder.customerPhone}</p>
//                     {selectedOrder.customerEmail && (
//                       <p><span className="font-medium">Email:</span> {selectedOrder.customerEmail}</p>
//                     )}
//                   </CardContent>
//                 </Card>
                
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="text-base">Order Information</CardTitle>
//                   </CardHeader>
//                   <CardContent className="space-y-1">
//                     <p>
//                       <span className="font-medium">Type:</span> 
//                       {selectedOrder.orderType.charAt(0).toUpperCase() + selectedOrder.orderType.slice(1)}
//                     </p>
//                     {selectedOrder.tableNumber && (
//                       <p><span className="font-medium">Table:</span> {selectedOrder.tableNumber}</p>
//                     )}
//                     {selectedOrder.deliveryAddress && (
//                       <p><span className="font-medium">Delivery Address:</span> {selectedOrder.deliveryAddress}</p>
//                     )}
//                     <p>
//                       <span className="font-medium">Payment:</span> 
//                       {selectedOrder.paymentMethod.charAt(0).toUpperCase() + selectedOrder.paymentMethod.slice(1)} 
//                       ({selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'})
//                     </p>
//                   </CardContent>
//                 </Card>
//               </div>
              
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="text-base">Order Items</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="border rounded-md divide-y">
//                     {selectedOrder.items.map((item, index) => (
//                       <div key={index} className="p-3 flex justify-between">
//                         <div>
//                           <p className="font-medium">{item.name}</p>
//                           <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
//                         </div>
//                         <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </CardContent>
//                 <CardFooter className="flex justify-between">
//                   <p className="font-semibold">Total</p>
//                   <p className="font-semibold">₹{selectedOrder.totalAmount.toFixed(2)}</p>
//                 </CardFooter>
//               </Card>
              
//               {selectedOrder.specialInstructions && (
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="text-base">Special Instructions</CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     <p>{selectedOrder.specialInstructions}</p>
//                   </CardContent>
//                 </Card>
//               )}
              
//               <div className="flex justify-end">
//                 <DialogClose asChild>
//                   <Button>Close</Button>
//                 </DialogClose>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// // Helper component for orders table
// const OrdersTable: FC<{
//   orders: Order[];
//   loading: boolean;
//   onViewDetails: (order: Order) => void;
//   updateOrderStatus: (orderId: string, status: Order['status']) => void;
//   getStatusBadgeColors: (status: Order['status']) => string;
//   getStatusIcon: (status: Order['status']) => JSX.Element | null;
//   formatDate: (timestamp: any) => string;
// }> = ({ 
//   orders, 
//   loading, 
//   onViewDetails, 
//   updateOrderStatus,
//   getStatusBadgeColors,
//   getStatusIcon,
//   formatDate
// }) => {
//   if (loading) {
//     return (
//       <div className="w-full flex justify-center p-12">
//         <Loader1 />
//       </div>
//     );
//   }

//   if (orders.length === 0) {
//     return (
//       <div className="text-center p-8 border rounded-lg">
//         <p className="text-lg font-medium text-gray-600">No orders found</p>
//         <p className="text-gray-500">Try changing your filters or search term</p>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full overflow-x-auto">
//       <table className="w-full border-collapse">
//         <thead>
//           <tr className="border-b">
//             <th className="px-4 py-3 text-left">Order ID</th>
//             <th className="px-4 py-3 text-left">Customer</th>
//             <th className="px-4 py-3 text-left">Type</th>
//             <th className="px-4 py-3 text-left">Amount</th>
//             <th className="px-4 py-3 text-left">Date</th>
//             <th className="px-4 py-3 text-left">Status</th>
//             <th className="px-4 py-3 text-left">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {orders.map((order) => (
//             <tr key={order.id} className="border-b hover:bg-gray-50">
//               <td className="px-4 py-3">#{order.id.slice(-6)}</td>
//               <td className="px-4 py-3">
//                 {order.customerName}<br />
//                 <span className="text-sm text-gray-500">{order.customerPhone}</span>
//               </td>
//               <td className="px-4 py-3">
//                 <Badge variant="outline">
//                   {order.orderType === 'dine-in' && 'Dine-in'}
//                   {order.orderType === 'takeaway' && 'Takeaway'}
//                   {order.orderType === 'delivery' && 'Delivery'}
//                 </Badge>
//               </td>
//               <td className="px-4 py-3">₹{order.totalAmount.toFixed(2)}</td>
//               <td className="px-4 py-3 whitespace-nowrap">{formatDate(order.createdAt)}</td>
//               <td className="px-4 py-3">
//                 <Badge className={getStatusBadgeColors(order.status)}>
//                   {getStatusIcon(order.status)}
//                   {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
//                 </Badge>
//               </td>
//               <td className="px-4 py-3">
//                 <div className="flex gap-2">
//                   <Button variant="ghost" size="sm" onClick={() => onViewDetails(order)}>
//                     Details
//                   </Button>
//                   <DropdownMenu>
//                     <DropdownMenuTrigger asChild>
//                       <Button variant="outline" size="sm">
//                         Status <ChevronDown className="ml-1 size-4" />
//                       </Button>
//                     </DropdownMenuTrigger>
//                     <DropdownMenuContent>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'pending')}>
//                         Mark as Pending
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>
//                         Mark as Preparing
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready')}>
//                         Mark as Ready
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'completed')}>
//                         Mark as Completed
//                       </DropdownMenuItem>
//                       <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')}>
//                         Mark as Cancelled
//                       </DropdownMenuItem>
//                     </DropdownMenuContent>
//                   </DropdownMenu>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// // import { FC, useEffect, useState, useCallback } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { Plus, Trash2 } from "lucide-react";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import Loader1 from "./Loader";
// // import { auth, db } from "../Database/FirebaseConfig";
// // import { Sidebar } from "./Sidebar";
// // import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
// // import { Label } from "@radix-ui/react-label";
// // import { collection, setDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
// // import Swal from 'sweetalert2';
// // import { useTheme } from './theme-provider';
// // import {
// //     Select,
// //     SelectContent,
// //     SelectGroup,
// //     SelectItem,
// //     SelectTrigger,
// //     SelectValue,
// //   } from "@/components/ui/select"

// // interface User {
// //     uid: string;
// //     email: string | null;
// //     displayName: string | null;
// //     photoURL: string | null;
// //   }

// // interface Order {
// //   id: string;
// //   customerName: string;
// //   items: string[];
// //   totalPrice: number;
// //   status: string; // e.g., "pending", "completed", "canceled"
// // }

// // interface Table {
// //   id: string;
// //   number: number;
// //   capacity: number;
// //   status: string; // e.g., "available", "reserved", "occupied"
// // }

// // export const ManageOrders = ({ tableNo }) => {
// //   const [user, setUser ] = useState<User | null>(null);
// //   const [orders, setOrders] = useState<Order[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [customerName, setCustomerName] = useState("");
// //   const [items, setItems] = useState<string[]>([]);
// //   const [totalPrice, setTotalPrice] = useState<number | "">("");
// //   const [status, setStatus] = useState("pending");
// //   const [selectedTable, setSelectedTable] = useState<Table | null>(null);
// //   const navigate = useNavigate();

// //   const { theme } = useTheme();

// //   const sweetAlertOptions: Record<string, unknown> = {
// //     background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
// //     color: theme === "dark" ? '#fff' : '#000',
// //     confirmButtonText: 'OK',
// //     confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
// //     cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
// //   };

// //   useEffect(() => {
// //     const unsubscribe = auth.onAuthStateChanged((currentUser ) => {
// //       if (currentUser ) {
// //         setUser (currentUser );
// //       } else {
// //         navigate("/admin/login");
// //       }
// //     });
// //     return () => unsubscribe();
// //   }, [navigate]);

// //   const fetchOrders = useCallback(async () => {
// //     try {
// //       const ordersCollection = collection(db, "Orders");
// //       const ordersSnapshot = await getDocs(ordersCollection);
// //       const orderList = ordersSnapshot.docs.map((doc) => ({
// //         id: doc.id,
// //         ...doc.data(),
// //       })) as Order[];
// //       setOrders(orderList);
// //     } catch (error) {
// //       console.error("Error fetching orders: ", error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, []);

// //   const handleSubmit = async () => {
// //     if (!customerName || items.length === 0 || totalPrice === "") {
// //       Swal.fire({
// //         ...sweetAlertOptions,
// //         title: "Error!",
// //         text: "Please fill in all fields.",
// //         icon: "error"
// //       });
// //       return;
// //     }

// //     const orderId = `${customerName}-${Date.now()}`; // Unique ID based on customer name and timestamp

// //     try {
// //       const orderData = {
// //         customerName,
// //         items,
// //         totalPrice: Number(totalPrice),
// //         status,
// //         tableId: selectedTable?.id, // Associate order with the selected table
// //       };

// //       const orderRef = doc(db, "Orders", orderId);
// //       await setDoc(orderRef, orderData);

// //       Swal.fire({
// //         ...sweetAlertOptions,
// //         title: "Success!",
// //         text: "Order created successfully!",
// //         icon: "success"
// //       });

// //       setCustomerName("");
// //       setItems([]);
// //       setTotalPrice("");
// //       setStatus("pending");
// //       setSelectedTable(null);
// //       fetchOrders();
// //     } catch (error) {
// //       console.error("Error creating order: ", error);
// //       Swal.fire({
// //         ...sweetAlertOptions,
// //         title: "Error!",
// //         text: "Something went wrong. Please try again!",
// //         icon: "error"
// //       });
// //     }
// //   };

// //   const handleDelete = async (orderId: string): Promise<void> => {
// //     Swal.fire({
// //       ...sweetAlertOptions,
// //       title: "Are you sure you want to delete this order?",
// //       showDenyButton: true,
// //       confirmButtonText: "Yes, delete order",
// //       denyButtonText: `No, don't delete`,
// //     }).then(async (result) => {
// //       if (result.isDenied) {
// //         return;
// //       } else if (result.isConfirmed) {
// //         try {
// //           const orderDoc = doc(db, "Orders", orderId);
// //           await deleteDoc(orderDoc);
// //           Swal.fire({
// //             ...sweetAlertOptions,
// //             title: "Success!",
// //             text: "Order deleted successfully!",
// //             icon: "success"
// //           });
// //           fetchOrders();
// //         } catch (error) {
// //           console.error("Error deleting order: ", error);
// //         }
// //       }
// //     });
// //   };

// //   useEffect(() => {
// //     fetchOrders();
// //   }, [fetchOrders]);

// //   return (
// //     <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
// //       {/* <Sidebar user={user} activePage="manage-orders" />
// //       <div className="flex flex-col h-screen">
// //         <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
// //           <div className="flex items-center">
// //             <h1 className="text-2xl text-primary font-bold">Manage Orders</h1>
// //           </div>
// //           <div className="w-full flex flex-wrap place-self-center relative justify-center">
// //             {loading ? (
// //               <div className="absolute items-center justify-center bg-opacity-50 z-10">
// //                 <Loader1 />
// //               </div>
// //             ) : orders.length === 0 ? (
// //               <p className="text-lg font-semibold text-gray-700 mt-0 text-left">
// //                 No orders available.
// //               </p>
// //             ) : (
// //               <div className="justify-center grid gap-x-16 gap-y-4 grid-cols-2 md:grid-cols-3 md:gap-y-4 md:gap-x-16 lg:grid-cols-3 lg:gap-x-24 lg:gap-y-3">
// //                 {orders.map((order) => (
// //                   <div key={order.id} className="border rounded-lg p-4 shadow-md">
// //                     <h2 className="text-lg font-bold">Order ID: {order.id}</h2>
// //                     <p>Customer: {order.customerName}</p>
// //                     <p>Items: {order.items.join(", ")}</p>
// //                     <p className="font-semibold">Total Price: ${order.totalPrice.toFixed(2)}</p>
// //                     <p>Status: {order.status}</p>
// //                     <Button variant="outline" onClick={() => handleDelete(order.id)} className="mt-2">
// //                       <Trash2 className="mr-2" /> Delete
// //                     </Button>
// //                   </div>
// //                 ))}
// //               </div>
// //             )}
// //           </div>

// //           {/* Dialog for Adding Order */}
// //           {/* <div className="mt-4"> */}
// //             {/* <h2 className="text-xl font-bold">Add Order to Table</h2> */}
// //               <Dialog>
// //                 <DialogTrigger asChild>
// //                   <Button variant="outline">
// //                     Add Order to Table {tableNo}
// //                   </Button>
// //                 </DialogTrigger>
// //                 <DialogContent>
// //                   <DialogHeader>
// //                     <DialogTitle>Add Order for Table {tableNo}</DialogTitle>
// //                   </DialogHeader>
// //                   <div className="grid gap-4">
// //                     <div>
// //                       <Label className="text-left font-semibold">Customer Name</Label>
// //                       <Input
// //                         type="text"
// //                         placeholder="Customer Name"
// //                         value={customerName}
// //                         onChange={(e) => setCustomerName(e.target.value)}
// //                       />
// //                     </div>
// //                     <div>
// //                       <Label className="text-left font-semibold">Items Ordered</Label>
// //                       <Input
// //                         type="text"
// //                         placeholder="Items (comma separated)"
// //                         value={items.join(", ")}
// //                         onChange={(e) => setItems(e.target.value.split(",").map(item => item.trim()))}
// //                       />
// //                     </div>
// //                     <div>
// //                       <Label className="text-left font-semibold">Total Price</Label>
// //                       <Input
// //                         type="number"
// //                         placeholder="Total Price"
// //                         value={totalPrice}
// //                         onChange={(e) => setTotalPrice(Number(e.target.value))}
// //                       />
// //                     </div>
// //                     <div>
// //                       <Label className="text-left font-semibold">Status</Label>
// //                       <Select
// //                         value={status}
// //                         onValueChange={setStatus}
// //                       >
// //                         <SelectTrigger className="focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-neutral-100 dark:bg-neutral-900 border-neutral-700 dark:border-neutral-700 text-neutral-800 dark:text-neutral-400 placeholder-neutral-700 dark:placeholder-neutral-500 focus:ring-neutral-600 dark">
// //                             <SelectValue placeholder="Select an option" className="w-full border rounded-md p-2" />
// //                         </SelectTrigger>
// //                         <SelectContent>
// //                             <SelectItem value="pending">Pending</SelectItem>
// //                             <SelectItem value="completed">Completed</SelectItem>
// //                             <SelectItem value="canceled">Canceled</SelectItem>
// //                         </SelectContent>
// //                       </Select>
// //                     </div>
// //                   </div>
// //                   <DialogClose>
// //                     <Button variant="outline" onClick={handleSubmit} className="mt-4">
// //                       Submit Order
// //                     </Button>
// //                   </DialogClose>
// //                 </DialogContent>
// //               </Dialog>
// //           {/* </div>
// //         </main> */}
// //       {/* </div> */}
// //     </div>
// //   );
// // };