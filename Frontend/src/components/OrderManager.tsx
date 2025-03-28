import { FC, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader1 from "./Loader";
import { auth, db } from "../Database/FirebaseConfig";
import { Sidebar } from "./Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { collection, setDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

interface Order {
  id: string;
  customerName: string;
  items: string[];
  totalPrice: number;
  status: string; // e.g., "pending", "completed", "canceled"
}

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string; // e.g., "available", "reserved", "occupied"
}

export const ManageOrders = ({ tableNo }) => {
  const [user, setUser ] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState<number | "">("");
  const [status, setStatus] = useState("pending");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const navigate = useNavigate();

  const { theme } = useTheme();

  const sweetAlertOptions: Record<string, unknown> = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser ) => {
      if (currentUser ) {
        setUser (currentUser );
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchOrders = useCallback(async () => {
    try {
      const ordersCollection = collection(db, "Orders");
      const ordersSnapshot = await getDocs(ordersCollection);
      const orderList = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setOrders(orderList);
    } catch (error) {
      console.error("Error fetching orders: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!customerName || items.length === 0 || totalPrice === "") {
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Please fill in all fields.",
        icon: "error"
      });
      return;
    }

    const orderId = `${customerName}-${Date.now()}`; // Unique ID based on customer name and timestamp

    try {
      const orderData = {
        customerName,
        items,
        totalPrice: Number(totalPrice),
        status,
        tableId: selectedTable?.id, // Associate order with the selected table
      };

      const orderRef = doc(db, "Orders", orderId);
      await setDoc(orderRef, orderData);

      Swal.fire({
        ...sweetAlertOptions,
        title: "Success!",
        text: "Order created successfully!",
        icon: "success"
      });

      setCustomerName("");
      setItems([]);
      setTotalPrice("");
      setStatus("pending");
      setSelectedTable(null);
      fetchOrders();
    } catch (error) {
      console.error("Error creating order: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Something went wrong. Please try again!",
        icon: "error"
      });
    }
  };

  const handleDelete = async (orderId: string): Promise<void> => {
    Swal.fire({
      ...sweetAlertOptions,
      title: "Are you sure you want to delete this order?",
      showDenyButton: true,
      confirmButtonText: "Yes, delete order",
      denyButtonText: `No, don't delete`,
    }).then(async (result) => {
      if (result.isDenied) {
        return;
      } else if (result.isConfirmed) {
        try {
          const orderDoc = doc(db, "Orders", orderId);
          await deleteDoc(orderDoc);
          Swal.fire({
            ...sweetAlertOptions,
            title: "Success!",
            text: "Order deleted successfully!",
            icon: "success"
          });
          fetchOrders();
        } catch (error) {
          console.error("Error deleting order: ", error);
        }
      }
    });
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      {/* <Sidebar user={user} activePage="manage-orders" />
      <div className="flex flex-col h-screen">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center">
            <h1 className="text-2xl text-primary font-bold">Manage Orders</h1>
          </div>
          <div className="w-full flex flex-wrap place-self-center relative justify-center">
            {loading ? (
              <div className="absolute items-center justify-center bg-opacity-50 z-10">
                <Loader1 />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-lg font-semibold text-gray-700 mt-0 text-left">
                No orders available.
              </p>
            ) : (
              <div className="justify-center grid gap-x-16 gap-y-4 grid-cols-2 md:grid-cols-3 md:gap-y-4 md:gap-x-16 lg:grid-cols-3 lg:gap-x-24 lg:gap-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 shadow-md">
                    <h2 className="text-lg font-bold">Order ID: {order.id}</h2>
                    <p>Customer: {order.customerName}</p>
                    <p>Items: {order.items.join(", ")}</p>
                    <p className="font-semibold">Total Price: ${order.totalPrice.toFixed(2)}</p>
                    <p>Status: {order.status}</p>
                    <Button variant="outline" onClick={() => handleDelete(order.id)} className="mt-2">
                      <Trash2 className="mr-2" /> Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dialog for Adding Order */}
          {/* <div className="mt-4"> */}
            {/* <h2 className="text-xl font-bold">Add Order to Table</h2> */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    Add Order to Table {tableNo}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Order for Table {tableNo}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-left font-semibold">Customer Name</Label>
                      <Input
                        type="text"
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-left font-semibold">Items Ordered</Label>
                      <Input
                        type="text"
                        placeholder="Items (comma separated)"
                        value={items.join(", ")}
                        onChange={(e) => setItems(e.target.value.split(",").map(item => item.trim()))}
                      />
                    </div>
                    <div>
                      <Label className="text-left font-semibold">Total Price</Label>
                      <Input
                        type="number"
                        placeholder="Total Price"
                        value={totalPrice}
                        onChange={(e) => setTotalPrice(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-left font-semibold">Status</Label>
                      <Select
                        value={status}
                        onValueChange={setStatus}
                      >
                        <SelectTrigger className="focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-neutral-100 dark:bg-neutral-900 border-neutral-700 dark:border-neutral-700 text-neutral-800 dark:text-neutral-400 placeholder-neutral-700 dark:placeholder-neutral-500 focus:ring-neutral-600 dark">
                            <SelectValue placeholder="Select an option" className="w-full border rounded-md p-2" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="canceled">Canceled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogClose>
                    <Button variant="outline" onClick={handleSubmit} className="mt-4">
                      Submit Order
                    </Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
          {/* </div>
        </main> */}
      {/* </div> */}
    </div>
  );
};