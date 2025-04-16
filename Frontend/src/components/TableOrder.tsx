import { FC, useEffect, useState } from "react";
import { Check, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { db } from "../Database/FirebaseConfig";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type TableStatus = 'available' | 'occupied' | 'reserved';

interface TableItem {
  id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
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
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  tableNumber: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'online';
  paymentStatus: 'paid' | 'unpaid';
  specialInstructions?: string;
  createdAt: any;
  updatedAt: any;
}

interface FoodMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isVegetarian: boolean;
  isAvailable: boolean;
}

export const TableOrderPage: FC = () => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<FoodMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isManageOrderDialogOpen, setIsManageOrderDialogOpen] = useState(false);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isChangeStatusDialogOpen, setIsChangeStatusDialogOpen] = useState(false);
  const [newTableStatus, setNewTableStatus] = useState<TableStatus>('available');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');

  const { theme } = useTheme();

  const sweetAlertOptions = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  useEffect(() => {
    fetchTables();
    fetchOrders();
    fetchMenuItems();

  }, []);

  const fetchTables = async () => {
    try {
      const tablesCollection = collection(db, "Tables");
      const tablesSnapshot = await getDocs(tablesCollection);
      
      const tablesData: TableItem[] = [];
      
      tablesSnapshot.docs.forEach(doc => {
        const table = { id: doc.id, ...doc.data() } as TableItem;
        tablesData.push(table);
      });
      
      setTables(tablesData.sort((a, b) => parseInt(a.number) - parseInt(b.number)));
      console.log("Tables fetched:", tablesData);
    } catch (error) {
      console.error("Error fetching tables:", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to load tables. Please refresh the page.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const ordersCollection = collection(db, "Orders");
      const q = query(ordersCollection, where("orderType", "==", "dine-in"));
      const ordersSnapshot = await getDocs(q);
      
      const ordersData: Order[] = [];
      
      ordersSnapshot.docs.forEach(doc => {
        const order = { id: doc.id, ...doc.data() } as Order;
        if (order.status !== 'completed' && order.status !== 'cancelled') {
          ordersData.push(order);
        }
      });
      
      setOrders(ordersData);
      console.log("Orders fetched:", ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const itemsCollection = collection(db, "Menu");
      const itemsSnapshot = await getDocs(itemsCollection);
      
      const items: FoodMenuItem[] = [];
      
      itemsSnapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as FoodMenuItem;
        if (item.isAvailable) {
          items.push(item);
        }
      });
      
      setMenuItems(items);
      console.log("Menu items fetched:", items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const getOrderForTable = (tableNumber: string) => {
    return orders?.find(order => 
      order.tableNumber === tableNumber && 
      (order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'served')
    );
  };

  const handleOpenChangeStatusDialog = (table: TableItem) => {
    setSelectedTable(table);
    setNewTableStatus(table.status);
    setIsChangeStatusDialogOpen(true);
  };

  const handleChangeTableStatus = async () => {
    if (!selectedTable) return;

    try {
      setIsLoading(true);
      
      await updateDoc(doc(db, "Tables", selectedTable.id), {
        status: newTableStatus,
        updatedAt: serverTimestamp()
      });
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Status Updated",
        text: `Table ${selectedTable.number} status changed to ${newTableStatus}.`,
        icon: "success"
      });
      
      fetchTables();
      setIsChangeStatusDialogOpen(false);
    } catch (error) {
      console.error("Error updating table status:", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error",
        text: "Failed to update table status.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageOrder = (table: TableItem) => {
    setSelectedTable(table);
    const order = getOrderForTable(table.number);
    if (order) {
      setSelectedOrder(order);
      console.log("Manage Order for Table", table.number, "Order:", order.id);
      setIsManageOrderDialogOpen(true);
    } else {
      // For tables with no active order, redirect to food ordering page
      // In a real app, this would navigate to the food ordering page with table pre-selected
      Swal.fire({
        ...sweetAlertOptions,
        title: "No Active Order",
        text: `Create a new order for Table ${table.number}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Create Order",
      }).then((result) => {
        if (result.isConfirmed) {
          // This would typically navigate to order creation
          console.log("Navigate to order creation for table", table.number);
        }
      });
    }
  };

  const handleGenerateBill = (table: TableItem) => {
    setSelectedTable(table);
    const order = getOrderForTable(table.number);
    if (order) {
      setSelectedOrder(order);
      setIsBillDialogOpen(true);
    } else {
      Swal.fire({
        ...sweetAlertOptions,
        title: "No Active Order",
        text: `Table ${table.number} doesn't have an active order to generate a bill for.`,
        icon: "info"
      });
    }
  };

  const handleUpdateOrderStatus = async (newStatus: Order['status']) => {
    if (!selectedOrder) return;

    try {
      setIsLoading(true);
      
      await updateDoc(doc(db, "Orders", selectedOrder.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // If order is completed, also update the table status if it's currently occupied
      if (newStatus === 'completed' && selectedTable && selectedTable.status === 'occupied') {
        await updateDoc(doc(db, "Tables", selectedTable.id), {
          status: 'available',
          currentOrderId: null
        });
      }
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Updated",
        text: `Order status updated to ${newStatus}.`,
        icon: "success"
      });
      
      fetchOrders();
      fetchTables();
      
      if (newStatus === 'completed') {
        setIsManageOrderDialogOpen(false);
        setIsBillDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error",
        text: "Failed to update order status.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;

    try {
      setIsLoading(true);
      
      await updateDoc(doc(db, "Orders", selectedOrder.id), {
        paymentStatus: 'paid',
        paymentMethod: selectedPaymentMethod,
        updatedAt: serverTimestamp()
      });

      // Create a receipt/transaction record
      await addDoc(collection(db, "Transactions"), {
        orderId: selectedOrder.id,
        customerId: selectedOrder.customerPhone,
        amount: selectedOrder.totalAmount,
        paymentMethod: selectedPaymentMethod,
        type: 'payment',
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Payment Processed",
        text: `Payment of ₹${selectedOrder.totalAmount.toFixed(2)} processed successfully.`,
        icon: "success"
      });
      
      // Update order to completed
      handleUpdateOrderStatus('completed');
    } catch (error) {
      console.error("Error processing payment:", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error",
        text: "Failed to process payment.",
        icon: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintBill = () => {
    Swal.fire({
      ...sweetAlertOptions,
      title: "Printing",
      text: "Sending bill to printer...",
      icon: "info",
      timer: 1500,
      showConfirmButton: false
    });
  };

  const filteredTables = tables.filter(table => {
    if (activeTab === 'available') return table.status === 'available';
    if (activeTab === 'occupied') return table.status === 'occupied';
    if (activeTab === 'reserved') return table.status === 'reserved';
    return true;
  });

  if (isLoading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Table Management</h1>
        <p className="text-center text-gray-500 mb-6">Manage tables and dine-in orders</p>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All Tables</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="occupied">Occupied</TabsTrigger>
            <TabsTrigger value="reserved">Reserved</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredTables && filteredTables.length > 0 && filteredTables.map(table => (
            <TableCard 
              key={table.id} 
              table={table} 
              order={getOrderForTable(table.number)}
              onChangeStatus={() => handleOpenChangeStatusDialog(table)}
              onManageOrder={() => handleManageOrder(table)}
              onGenerateBill={() => handleGenerateBill(table)}
            />
          ))}
        </div>
        
        {filteredTables.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tables found with the current filter.</p>
          </div>
        )}
      </main>

      {/* Change Table Status Dialog */}
      <Dialog open={isChangeStatusDialogOpen} onOpenChange={setIsChangeStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Table Status</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tableStatus">Table {selectedTable?.number} Status</Label>
              <Select 
                value={newTableStatus} 
                onValueChange={(value) => setNewTableStatus(value as TableStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select table status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedTable && getOrderForTable(selectedTable.number) && newTableStatus === 'available' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md text-sm">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Warning: This table has an active order. Changing status to available will not affect the order.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeTableStatus} disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Order Dialog */}
      <Dialog open={isManageOrderDialogOpen} onOpenChange={setIsManageOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                Table {selectedTable?.number} Order
                <Badge className="ml-2" variant={
                  selectedOrder?.status === 'pending' ? 'outline' :
                  selectedOrder?.status === 'preparing' ? 'secondary' :
                  selectedOrder?.status === 'ready' ? 'default' :
                  selectedOrder?.status === 'served' ? 'success' : 'outline'
                }>
                  {selectedOrder?.status}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Customer Details</h4>
                <p className="text-sm">{selectedOrder.customerName} | {selectedOrder.customerPhone}</p>
                {selectedOrder.specialInstructions && (
                  <div className="mt-2">
                    <h4 className="font-medium mb-1">Special Instructions</h4>
                    <p className="text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                      {selectedOrder.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Order Items</h4>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {selectedOrder?.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">₹{item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 space-y-3">
                <h4 className="font-medium">Update Order Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button
                      onClick={() => handleUpdateOrderStatus('preparing')}
                      disabled={isLoading}
                    >
                      Start Preparing
                    </Button>
                  )}
                  
                  {selectedOrder.status === 'preparing' && (
                    <Button
                      onClick={() => handleUpdateOrderStatus('ready')}
                      disabled={isLoading}
                    >
                      Mark as Ready
                    </Button>
                  )}
                  
                  {selectedOrder.status === 'ready' && (
                    <Button
                      onClick={() => handleUpdateOrderStatus('served')}
                      disabled={isLoading}
                    >
                      Mark as Served
                    </Button>
                  )}
                  
                  {(selectedOrder.status === 'served' || selectedOrder.status === 'ready') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsManageOrderDialogOpen(false);
                        handleGenerateBill(selectedTable!);
                      }}
                      disabled={isLoading}
                    >
                      Generate Bill
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateOrderStatus('cancelled')}
                    disabled={isLoading || selectedOrder.status === 'served'}
                  >
                    Cancel Order
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Generation Dialog */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Bill - Table {selectedTable?.number}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold">Restaurant Name</h3>
                  <p className="text-sm text-gray-500">123 Restaurant Street, City</p>
                  <p className="text-sm text-gray-500">Phone: 123-456-7890</p>
                </div>
                
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="text-sm"><strong>Bill #:</strong> {selectedOrder.id.substring(0, 8)}</p>
                    <p className="text-sm"><strong>Table:</strong> {selectedOrder.tableNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm"><strong>Date:</strong> {selectedOrder.createdAt?.toDate?.().toLocaleDateString() || new Date().toLocaleDateString()}</p>
                    <p className="text-sm"><strong>Time:</strong> {selectedOrder.createdAt?.toDate?.().toLocaleTimeString() || new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
                
                <table className="w-full mb-4">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2">Item</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index} className="border-b border-dashed">
                        <td className="py-2">{item.name}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">₹{item.price.toFixed(2)}</td>
                        <td className="text-right py-2">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="space-y-1 border-t pt-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{(selectedOrder.totalAmount * 0.95).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (5%)</span>
                    <span>₹{(selectedOrder.totalAmount * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t">
                    <span>Total</span>
                    <span>₹{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="mt-6 text-center text-sm">
                  <p>Thank you for dining with us!</p>
                  <p>We hope to see you again soon.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select 
                    value={selectedPaymentMethod} 
                    onValueChange={(value) => setSelectedPaymentMethod(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline"
                    onClick={handlePrintBill}
                    className="flex items-center gap-2"
                  >
                    <Printer className="size-4" />
                    Print Bill
                  </Button>
                  
                  <Button 
                    onClick={handleProcessPayment}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Process Payment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for table cards
const TableCard: FC<{
  table: TableItem;
  order?: Order;
  onChangeStatus: () => void;
  onManageOrder: () => void;
  onGenerateBill: () => void;
}> = ({ table, order, onChangeStatus, onManageOrder, onGenerateBill }) => {
  return (
    <Card className={
      table.status === 'available' ? 'border-green-500 border-2' :
      table.status === 'occupied' ? 'border-red-500 border-2' :
      table.status === 'reserved' ? 'border-blue-500 border-2' : ''
    }>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Table {table.number}</CardTitle>
          <Badge variant={
            table.status === 'available' ? 'success' :
            table.status === 'occupied' ? 'destructive' :
            table.status === 'reserved' ? 'default' : 'outline'
          }>
            {table.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-gray-500">Capacity: {table.capacity} people</p>
        
        {order && (
          <div className="mt-2">
            <p className="text-sm font-semibold">Active Order:</p>
            <p className="text-sm">{order.customerName}</p>
            <p className="text-sm text-gray-500"> • ₹{order.totalAmount.toFixed(2)}</p>
            <Badge variant={
              order.status === 'pending' ? 'outline' :
              order.status === 'preparing' ? 'secondary' :
              order.status === 'ready' ? 'default' :
              order.status === 'served' ? 'success' : 'outline'
            } className="mt-1">
              {order.status}
            </Badge>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <div className="grid grid-cols-1 gap-2 w-full">
          <Button 
            onClick={onChangeStatus}
            className="w-full"
          >
            Change Status
          </Button>
          
          {(table.status === 'available' || table.status === 'occupied') && (
            <Button 
              variant="outline"
              onClick={onManageOrder}
              className="w-full"
            >
              {order ? "Manage Order" : "Create Order"}
            </Button>
          )}
          
          {table.status === 'occupied' && order && (
            <Button 
              onClick={onGenerateBill}
              disabled={!order || (order.status !== 'served' && order.status !== 'ready')}
              className="w-full"
            >
              Generate Bill
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};