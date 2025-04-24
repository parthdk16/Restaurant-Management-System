// Orders Page Component
import { FC, useEffect, useState } from "react";
import { ShoppingBag, MapPin, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from 'sweetalert2';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  tableNumber: string | null;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  specialInstructions: string | null;
  createdAt: any;
  updatedAt: any;
  orderType: string;
  deliveryAddress: string | null;
}

export const OrdersPage: FC<{
    userId: string;
  }> = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
      fetchOrders();
    }, []);
    
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        
        // In a real app, you would fetch orders from Firebase
        // const ordersCollection = collection(db, "Orders");
        // const userOrdersQuery = query(ordersCollection, where("userId", "==", userId));
        // const ordersSnapshot = await getDocs(userOrdersQuery);
        
        // Mock data for demonstration
        const mockOrders: Order[] = [
          {
            id: "order1",
            customerName: "John Doe",
            customerPhone: "1234567890",
            customerEmail: "john.doe@example.com",
            items: [
              { id: "item1", name: "Butter Chicken", price: 350, quantity: 1 },
              { id: "item2", name: "Garlic Naan", price: 60, quantity: 2 }
            ],
            status: "preparing",
            tableNumber: null,
            totalAmount: 470,
            paymentMethod: "online",
            paymentStatus: "paid",
            specialInstructions: "Extra spicy please",
            createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
            orderType: "delivery",
            deliveryAddress: "123 Main St, City, State, 12345"
          },
          {
            id: "order2",
            customerName: "John Doe",
            customerPhone: "1234567890",
            customerEmail: "john.doe@example.com",
            items: [
              { id: "item3", name: "Masala Dosa", price: 120, quantity: 2 },
              { id: "item4", name: "Filter Coffee", price: 40, quantity: 2 }
            ],
            status: "delivered",
            tableNumber: null,
            totalAmount: 280,
            paymentMethod: "cash",
            paymentStatus: "paid",
            specialInstructions: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
            orderType: "takeaway",
            deliveryAddress: null
          },
          {
            id: "order3",
            customerName: "John Doe",
            customerPhone: "1234567890",
            customerEmail: "john.doe@example.com",
            items: [
              { id: "item5", name: "Paneer Tikka", price: 220, quantity: 1 },
              { id: "item6", name: "Veg Biryani", price: 180, quantity: 1 },
              { id: "item7", name: "Lassi", price: 80, quantity: 2 }
            ],
            status: "delivered",
            tableNumber: null,
            totalAmount: 560,
            paymentMethod: "online",
            paymentStatus: "paid",
            specialInstructions: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
            updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
            orderType: "delivery",
            deliveryAddress: "123 Main St, City, State, 12345"
          }
        ];
        
        setOrders(mockOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to load order history. Please try again.",
          icon: "error"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // Get current/active orders (preparing or pending)
    const currentOrders = orders.filter(order => 
      order.status === 'pending' || order.status === 'preparing' || order.status === 'ready'
    );
    
    // Get past orders (delivered or cancelled)
    const pastOrders = orders.filter(order => 
      order.status === 'delivered' || order.status === 'cancelled'
    );
    
    // Helper function for status badge color
    const getStatusBadgeColor = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'preparing': return 'bg-blue-100 text-blue-800';
        case 'ready': return 'bg-green-100 text-green-800';
        case 'delivered': return 'bg-gray-100 text-gray-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ClipboardList className="size-6" />
          My Orders
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Current Orders Section */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Current Orders</h3>
              
              {currentOrders.length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="py-6">
                    <p className="text-center text-gray-500">No active orders</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {currentOrders.map(order => (
                    <Card key={order.id} className="bg-white overflow-hidden border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <CardTitle className="text-lg">
                            Order #{order.id.substring(0, 6)}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            <Badge className={getStatusBadgeColor(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`order-${order.id}`}>
                            <AccordionTrigger className="py-2">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 text-left">
                                <div className="font-medium">
                                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </div>
                                <div className="text-primary font-semibold">
                                  ₹{order.totalAmount.toFixed(2)}
                                </div>
                                <div className="text-sm flex items-center gap-1">
                                  {order.orderType === 'delivery' ? (
                                    <>
                                      <MapPin className="size-3" />
                                      Delivery
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="size-3" />
                                      Takeaway
                                    </>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            
                            <AccordionContent>
                              <div className="space-y-3 pt-2">
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>{item.name} x {item.quantity}</span>
                                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="pt-2 border-t">
                                  <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>₹{order.totalAmount.toFixed(2)}</span>
                                  </div>
                                </div>
                                
                                {order.specialInstructions && (
                                  <div className="pt-2 text-sm">
                                    <span className="font-medium">Special Instructions: </span>
                                    <span>{order.specialInstructions}</span>
                                  </div>
                                )}
                                
                                {order.orderType === 'delivery' && order.deliveryAddress && (
                                  <div className="pt-2 text-sm">
                                    <span className="font-medium">Delivery Address: </span>
                                    <span>{order.deliveryAddress}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between pt-2 text-sm">
                                  <div>
                                    <span className="font-medium">Payment: </span>
                                    <span className="capitalize">{order.paymentMethod}</span>
                                  </div>
                                  <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'destructive'}>
                                    {order.paymentStatus}
                                  </Badge>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
            
            {/* Past Orders Section */}
            <section>
              <h3 className="text-xl font-semibold mb-3">Order History</h3>
              
              {pastOrders.length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="py-6">
                    <p className="text-center text-gray-500">No order history</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pastOrders.map(order => (
                    <Card key={order.id} className="bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <CardTitle className="text-lg">
                            Order #{order.id.substring(0, 6)}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            <Badge className={getStatusBadgeColor(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`order-${order.id}`}>
                            <AccordionTrigger className="py-2">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 text-left">
                                <div className="font-medium">
                                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </div>
                                <div className="text-primary font-semibold">
                                  ₹{order.totalAmount.toFixed(2)}
                                </div>
                                <div className="text-sm flex items-center gap-1">
                                  {order.orderType === 'delivery' ? (
                                    <>
                                      <MapPin className="size-3" />
                                      Delivery
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="size-3" />
                                      Takeaway
                                    </>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            
                            <AccordionContent>
                              <div className="space-y-3 pt-2">
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>{item.name} x {item.quantity}</span>
                                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="pt-2 border-t">
                                  <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>₹{order.totalAmount.toFixed(2)}</span>
                                  </div>
                                </div>
                                
                                {order.specialInstructions && (
                                  <div className="pt-2 text-sm">
                                    <span className="font-medium">Special Instructions: </span>
                                    <span>{order.specialInstructions}</span>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                      
                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          Reorder
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    );
  };