import { FC, useEffect, useState } from "react";
import { User as UserIcon, Mail, Phone, MapPin, Calendar, ShoppingBag, MessageSquare, Star, Settings, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { updateProfile } from "firebase/auth";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  email: string;
  defaultAddress?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Order {
  id: string;
  orderNumber: string;
  items: any[];
  status: string;
  total: number;
  createdAt: any;
  estimatedDelivery?: any;
  orderType?: string;
}

interface Feedback {
  id: string;
  rating: number;
  comment: string;
  createdAt: any;
  orderNumber?: string;
}

const ProfilePage: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    phone: '',
    email: ''
  });
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    rating: 5,
    comment: '',
    orderNumber: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const openOrderDetailsDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const userDetails: User = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        };
        setUser(userDetails);
        
        // Initialize form data with user information from Firebase Auth
        setFormData({
          id: currentUser.uid,
          name: currentUser.displayName || '',
          phone: '', // Phone number isn't typically stored in basic Firebase Auth
          email: currentUser.email || '',
          defaultAddress: '',
          createdAt: currentUser.metadata?.creationTime || new Date().toISOString(),
        });
        
      } else {
        setUser(null);
        navigate("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchUserDoc = async () => {
      try {
        if (!user || !user.email) return;
        setIsLoading(true);
        const usersRef = collection(db, "Users");
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setFormData({
            name: userData.name || user.displayName || '',
            phone: userData.phone || '',
            email: userData.email || user.email || '',
            defaultAddress: userData.defaultAddress || '',
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
          });
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to load profile information. Please refresh the page.",
          icon: "error"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDoc();
  }, [user]);

  // Fetch orders when active tab changes to orders
  useEffect(() => {
    if (activeTab === "orders" && user?.email) {
      fetchOrders();
    }
  }, [activeTab, user?.email]);
  
  // Fetch feedback when active tab changes to feedback
  useEffect(() => {
    if (activeTab === "feedback" && user?.email) {
      fetchFeedback();
    }
  }, [activeTab, user?.email]);
  
  const fetchOrders = async () => {
    if (!user?.email) return;
    
    try {
      setOrderLoading(true);
      const ordersRef = collection(db, "Orders");
      const q = query(
        ordersRef, 
        where("customerEmail", "==", user.email)
      );
      
      const querySnapshot = await getDocs(q);
      console.log("Orders fetched:", querySnapshot.docs.length);
      
      const current: Order[] = [];
      const past: Order[] = [];
      
      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        const order: Order = {
          id: doc.id,
          orderNumber: orderData.orderNumber || doc.id.slice(0, 8).toUpperCase(),
          items: orderData.items || [],
          status: orderData.status || 'Processing',
          total: orderData.totalAmount || 0,
          createdAt: orderData.createdAt,
          estimatedDelivery: orderData.estimatedDelivery,
          orderType: orderData.orderType
        };
        
        // Split orders between current and past based on status
        const activeStatuses = ['pending', 'preparing', 'ready'];
        if (activeStatuses.includes(order.status)) {
          current.push(order);
        } else {
          past.push(order);
        }
      });

      // Sort manually after fetching
      current.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });
      
      past.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });
      
      setCurrentOrders(current);
      setPastOrders(past);
      
    } catch (error) {
      console.error("Error fetching orders:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load order information. Please try again.",
        icon: "error"
      });
    } finally {
      setOrderLoading(false);
    }
  };
  
  const fetchFeedback = async () => {
    if (!user?.email) return;
    
    try {
      setFeedbackLoading(true);
      const feedbackRef = collection(db, "Feedback");
      const q = query(
        feedbackRef, 
        where("userEmail", "==", user.email),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      
      const feedbacks: Feedback[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedbacks.push({
          id: doc.id,
          rating: data.rating || 5,
          comment: data.comment || '',
          createdAt: data.createdAt,
          orderNumber: data.orderNumber
        });
      });
      
      setFeedbackList(feedbacks);
      
    } catch (error) {
      console.error("Error fetching feedback:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load feedback information. Please try again.",
        icon: "error"
      });
    } finally {
      setFeedbackLoading(false);
    }
  };
  
  const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setNewFeedback({
      ...newFeedback,
      [name]: name === 'rating' ? parseInt(value) : value
    });
  };
  
  const submitFeedback = async () => {
    if (!user?.email || !newFeedback.comment.trim()) {
      Swal.fire({
        title: "Missing Information",
        text: "Please add a comment to your feedback",
        icon: "warning"
      });
      return;
    }
    
    try {
      const feedbackRef = collection(db, "Feedback");
      await setDoc(doc(feedbackRef), {
        userEmail: user.email,
        userName: formData.name,
        rating: newFeedback.rating,
        comment: newFeedback.comment,
        orderNumber: newFeedback.orderNumber || null,
        createdAt: serverTimestamp()
      });
      
      setNewFeedback({
        rating: 5,
        comment: '',
        orderNumber: ''
      });
      
      await fetchFeedback();
      
      Swal.fire({
        title: "Thank You!",
        text: "Your feedback has been submitted successfully",
        icon: "success"
      });
      
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to submit feedback. Please try again.",
        icon: "error"
      });
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const saveProfile = async () => {
    if (!formData.name || !formData.phone || !formData.email) {
      Swal.fire({
        title: "Missing Information",
        text: "Please fill in all required fields",
        icon: "warning"
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      if (user) {
        // Update displayName in Firebase Auth
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { 
            displayName: formData.name 
          });
        }
        
        // Update or create user document in Firestore
        const userDocRef = doc(db, "Users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          // Document exists, update it
          await updateDoc(userDocRef, {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            defaultAddress: formData.defaultAddress,
            updatedAt: serverTimestamp()
          });
        } else {
          // Document doesn't exist, create it
          await setDoc(userDocRef, {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            defaultAddress: formData.defaultAddress || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
      
      setIsEditing(false);
      
      Swal.fire({
        title: "Success",
        text: "Profile updated successfully",
        icon: "success"
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to update profile. Please try again.",
        icon: "error"
      });
    } finally {
      setIsSaving(false);
    }
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
  
  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Card className="bg-white">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-primary"></div>
              <p className="text-muted-foreground">Loading profile information...</p>
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
                <UserIcon className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">My Account</CardTitle>
                <CardDescription>Manage your profile, orders and preferences</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b">
            <TabsList className="px-4 h-14">
              <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4" />
                  <span>Profile</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4" />
                  <span>My Orders</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  <span>Feedback</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <div className="flex items-center gap-2">
                  <Settings className="size-4" />
                  <span>Preferences</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Profile Tab Content */}
          <TabsContent value="profile" className="p-0">
            <CardContent className="pt-6 pb-2">
              {isEditing ? (
                <div className="space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="Your full name" 
                      required 
                      className="h-10"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      placeholder="10-digit phone number" 
                      required 
                      className="h-10"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      placeholder="your@email.com" 
                      required 
                      disabled
                      className="h-10 bg-gray-50"
                    />
                    <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="defaultAddress" className="text-sm font-medium">
                      Default Delivery Address
                    </Label>
                    <Textarea 
                      id="defaultAddress" 
                      name="defaultAddress" 
                      value={formData.defaultAddress || ''} 
                      onChange={handleChange} 
                      placeholder="Your default delivery address" 
                      rows={3} 
                      className="resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="h-9"
                    >
                      Edit Profile
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <UserIcon className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Full Name</p>
                          <p className="text-base font-medium">{formData.name || 'Not set'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Phone className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Phone Number</p>
                          <p className="text-base font-medium">{formData.phone || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Email Address</p>
                          <p className="text-base font-medium">{formData.email || 'Not set'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Calendar className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Member Since</p>
                          <p className="text-base font-medium">
                            {formatDate(formData.createdAt?.toDate?.() ? formData.createdAt.toDate().toISOString() : formData.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <MapPin className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Default Delivery Address</p>
                      <p className="text-base font-medium whitespace-pre-wrap">
                        {formData.defaultAddress || 'No address set'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            
            {isEditing && (
              <CardFooter className="flex justify-end gap-3 border-t pt-4 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Reset form data to current user values
                    setFormData({
                      id: user.uid,
                      name: user.displayName || '',
                      phone: formData.phone,
                      email: user.email || '',
                      defaultAddress: formData.defaultAddress || '',
                      createdAt: formData.createdAt,
                      updatedAt: formData.updatedAt
                    });
                    setIsEditing(false);
                  }}
                  className="h-9"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveProfile}
                  disabled={isSaving}
                  className="h-9"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            )}
          </TabsContent>
          
          {/* Orders Tab Content */}
          <TabsContent value="orders" className="p-0">
            <CardContent className="pt-6">
              {orderLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-primary mb-4"></div>
                  <p className="text-muted-foreground">Loading your orders...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Current Orders Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="size-5 text-primary" />
                      <h3 className="text-lg font-semibold">Current Orders</h3>
                    </div>
                    
                    {currentOrders.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <ShoppingBag className="size-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">No active orders at the moment</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => navigate("/food-order")}
                        >
                          Browse Menu
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentOrders.map((order) => (
                          <Card key={order.id} className="overflow-hidden">
                            <CardHeader className="bg-primary/5 py-3 px-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Order #{order.orderNumber}</p>
                                  <p className="text-sm">{formatTimestamp(order.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium 
                                    ${order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${order.status === 'Preparing' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' : ''}
                                    ${order.status === 'Ready for Pickup' ? 'bg-green-100 text-green-800' : ''}
                                  `}>
                                    {order.status}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="py-3 px-4">
                              <div className="space-y-3">
                                <p className="text-sm font-medium">Items:</p>
                                <div className="space-y-1 pl-2">
                                  {order.items.map((item, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{item.quantity}x {item.name}</span>
                                      <span className="font-medium">${item.price.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between pt-2 border-t text-base font-medium">
                                  <span>Total:</span>
                                  <span>${order.total.toFixed(2)}</span>
                                </div>
                                {order.estimatedDelivery && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Estimated Delivery:</span> {formatTimestamp(order.estimatedDelivery)}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50 py-2 px-4 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openOrderDetailsDialog(order)}
                            >
                              View Details
                            </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Past Orders Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingBag className="size-5 text-primary" />
                      <h3 className="text-lg font-semibold">Order History</h3>
                    </div>
                    
                    {pastOrders.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <ShoppingBag className="size-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">No past orders found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pastOrders.map((order) => (
                          <Card key={order.id} className="overflow-hidden">
                            <CardHeader className="bg-gray-50 py-3 px-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Order #{order.orderNumber}</p>
                                  <p className="text-sm">{formatTimestamp(order.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium 
                                    ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : ''}
                                    ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : ''}
                                    ${order.status === 'Canceled' ? 'bg-red-100 text-red-800' : ''}
                                  `}>
                                    {order.status}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="py-3 px-4">
                              <div className="flex justify-between text-base font-medium">
                                <span>Total:</span>
                                <span>${order.total.toFixed(2)}</span>
                              </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50 py-2 px-4 flex justify-between">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  // Set the order number in the feedback form
                                  setNewFeedback({
                                    ...newFeedback,
                                    orderNumber: order.orderNumber
                                  });
                                  
                                  // Switch to feedback tab
                                  setActiveTab("feedback");
                                }}
                              >
                                Leave Feedback
                              </Button>
                              <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openOrderDetailsDialog(order)}
                            >
                              View Details
                            </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>
          
          {/* Feedback Tab Content */}
          <TabsContent value="feedback" className="p-0">
            <CardContent className="pt-6">
              <div className="space-y-8">
                {/* New Feedback Form */}
                <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    Share Your Feedback
                  </h3>
                  
                  <Card className="bg-white">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="orderNumber">Order Reference (Optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="orderNumber"
                              name="orderNumber"
                              value={newFeedback.orderNumber}
                              onChange={handleFeedbackChange}
                              placeholder="Order number (if applicable)"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="rating">Rating</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewFeedback({...newFeedback, rating: star})}
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`h-6 w-6 ${
                                    star <= newFeedback.rating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="comment">Your Feedback</Label>
                          <Textarea
                            id="comment"
                            name="comment"
                            value={newFeedback.comment}
                            onChange={handleFeedbackChange}
                            placeholder="Tell us about your experience"
                            rows={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t">
                      <Button onClick={submitFeedback}>
                        Submit Feedback
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                {/* Previous Feedback */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    Your Previous Feedback
                  </h3>
                  
                  {feedbackLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-primary mb-4"></div>
                      <p className="text-muted-foreground">Loading your feedback...</p>
                    </div>
                  ) : feedbackList.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <MessageSquare className="size-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">You haven't submitted any feedback yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbackList.map((feedback) => (
                        <Card key={feedback.id} className="overflow-hidden">
                          <CardHeader className="py-3 px-4 bg-gray-50">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= feedback.rating 
                                          ? 'fill-yellow-400 text-yellow-400' 
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-medium">
                                  {feedback.orderNumber && `Order #${feedback.orderNumber}`}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatTimestamp(feedback.createdAt)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="py-3 px-4">
                            <p className="text-gray-700 whitespace-pre-wrap">{feedback.comment}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </TabsContent>
          
          {/* Preferences Tab Content */}
          <TabsContent value="preferences" className="p-0">
            <CardContent className="pt-6">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Settings className="size-5 text-primary" />
                    Notification Preferences
                  </h3>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">Order Updates</p>
                            <p className="text-sm text-gray-500">Receive notifications about your order status</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="order-updates" className="sr-only">
                              Toggle order updates
                            </Label>
                            <Input 
                              id="order-updates"
                              type="checkbox"
                              className="w-6 h-6 rounded"
                              defaultChecked
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t">
                          <div>
                            <p className="font-medium">Promotional Emails</p>
                            <p className="text-sm text-gray-500">Receive special offers and discounts</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="promo-emails" className="sr-only">
                              Toggle promotional emails
                            </Label>
                            <Input 
                              id="promo-emails"
                              type="checkbox"
                              className="w-6 h-6 rounded"
                              defaultChecked
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t">
                          <div>
                            <p className="font-medium">SMS Notifications</p>
                            <p className="text-sm text-gray-500">Receive text messages for important updates</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="sms-notifications" className="sr-only">
                              Toggle SMS notifications
                            </Label>
                            <Input 
                              id="sms-notifications"
                              type="checkbox"
                              className="w-6 h-6 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t">
                      <Button>
                        Save Preferences
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ShoppingBag className="size-5 text-primary" />
                    Dietary Preferences
                  </h3>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">Vegetarian Options</p>
                            <p className="text-sm text-gray-500">Highlight vegetarian dishes when browsing</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="vegetarian" className="sr-only">
                              Toggle vegetarian preference
                            </Label>
                            <Input 
                              id="vegetarian"
                              type="checkbox"
                              className="w-6 h-6 rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t">
                          <div>
                            <p className="font-medium">Vegan Options</p>
                            <p className="text-sm text-gray-500">Highlight vegan dishes when browsing</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="vegan" className="sr-only">
                              Toggle vegan preference
                            </Label>
                            <Input 
                              id="vegan"
                              type="checkbox"
                              className="w-6 h-6 rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t">
                          <div>
                            <p className="font-medium">Gluten-Free Options</p>
                            <p className="text-sm text-gray-500">Highlight gluten-free dishes when browsing</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="gluten-free" className="sr-only">
                              Toggle gluten-free preference
                            </Label>
                            <Input 
                              id="gluten-free"
                              type="checkbox"
                              className="w-6 h-6 rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t">
                          <div>
                            <p className="font-medium">Spicy Level Preference</p>
                            <p className="text-sm text-gray-500">Choose your preferred spice level</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <select 
                              id="spice-level" 
                              className="h-10 px-3 py-2 border rounded-md"
                              defaultValue="medium"
                            >
                              <option value="mild">Mild</option>
                              <option value="medium">Medium</option>
                              <option value="hot">Hot</option>
                              <option value="extra-hot">Extra Hot</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <Label htmlFor="allergies" className="text-sm font-medium block mb-2">
                            Allergies or Special Instructions
                          </Label>
                          <Textarea 
                            id="allergies"
                            placeholder="Let us know if you have any food allergies or special dietary requirements"
                            rows={3}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t">
                      <Button>
                        Save Preferences
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Settings className="size-5 text-primary" />
                    Account Settings
                  </h3>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left"
                          onClick={() => navigate("/reset-password")}
                        >
                          <span className="flex items-center gap-2">
                            <Settings className="size-4" />
                            Change Password
                          </span>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            Swal.fire({
                              title: "Sign Out",
                              text: "Are you sure you want to sign out?",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonText: "Yes, Sign Out",
                              cancelButtonText: "Cancel",
                            }).then((result) => {
                              if (result.isConfirmed) {
                                auth.signOut().then(() => {
                                  navigate("/login");
                                });
                              }
                            });
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span className="i-lucide-log-out size-4" />
                            Sign Out
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

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
              
              <div>
                <p className="font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <p>{item.quantity}x {item.name}</p>
                        {item.options && item.options.length > 0 && (
                          <p className="text-sm text-gray-500">
                            {item.options.map((opt: any) => opt.value).join(', ')}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">${item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
                {selectedOrder.tax && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-base mt-2">
                  <span>Total</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex justify-between border-t pt-2">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className={`py-1 rounded-full text-sm font-medium inline-block mt-1
                    ${selectedOrder.status === 'Processing' ? 'bg-blue-100 text-blue-800' : ''}
                    ${selectedOrder.status === 'Preparing' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${selectedOrder.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' : ''}
                    ${selectedOrder.status === 'Ready for Pickup' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'Completed' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'Canceled' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {selectedOrder.status}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 text-right">Order Type</p>
                  <div className={`py-1 text-right rounded-full text-sm font-medium inline-block mt-1
                    ${selectedOrder.status === 'Processing' ? 'bg-blue-100 text-blue-800' : ''}
                    ${selectedOrder.status === 'Preparing' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${selectedOrder.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' : ''}
                    ${selectedOrder.status === 'Ready for Pickup' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'Completed' ? 'bg-green-100 text-green-800' : ''}
                    ${selectedOrder.status === 'Canceled' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {selectedOrder.orderType?.trim()}
                  </div>
                </div>
                {selectedOrder.estimatedDelivery && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Estimated Delivery</p>
                    <p className="font-medium">{formatTimestamp(selectedOrder.estimatedDelivery)}</p>
                  </div>
                )}
              </div>
              
              {selectedOrder.status !== 'Canceled' && selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Completed' && (
                <div className="border-t pt-2">
                  <p className="text-sm text-gray-500 mb-2">Need to make changes?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsDialogOpen(false);
                      // Add logic to contact support
                    }}>
                      Contact Support
                    </Button>
                    {['Processing', 'Pending'].includes(selectedOrder.status) && (
                      <Button variant="destructive" size="sm" onClick={() => {
                        setIsDialogOpen(false);
                        // Add logic to cancel order
                      }}>
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {(selectedOrder.status === 'Delivered' || selectedOrder.status === 'Completed') && (
                <div className="border-t pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setNewFeedback({
                        ...newFeedback,
                        orderNumber: selectedOrder.orderNumber
                      });
                      setActiveTab("feedback");
                    }}
                  >
                    Leave Feedback
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProfilePage;

// import { FC, useEffect, useState } from "react";
// import { User as UserIcon, Mail, Phone, MapPin, Calendar } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import Swal from 'sweetalert2';
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
//   CardDescription
// } from "@/components/ui/card";
// import { useNavigate } from "react-router-dom";
// import { auth, db } from "@/Database/FirebaseConfig";
// import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
// import { updateProfile } from "firebase/auth";
// import { format } from "date-fns";

// interface User {
//   uid: string;
//   email: string | null;
//   displayName: string | null;
//   photoURL: string | null;
// }

// interface UserProfile {
//   id?: string;
//   name: string;
//   phone: string;
//   email: string;
//   defaultAddress?: string;
//   createdAt?: any;
//   updatedAt?: any;
// }

// const ProfilePage: FC = () => {
//   const [user, setUser] = useState<User | null>(null);
//   const [isEditing, setIsEditing] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [formData, setFormData] = useState<UserProfile>({
//     name: '',
//     phone: '',
//     email: ''
//   });
//   const navigate = useNavigate();

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((currentUser) => {
//       if (currentUser) {
//         const userDetails: User = {
//           uid: currentUser.uid,
//           email: currentUser.email,
//           displayName: currentUser.displayName,
//           photoURL: currentUser.photoURL,
//         };
//         setUser(userDetails);
        
//         // Initialize form data with user information from Firebase Auth
//         setFormData({
//           id: currentUser.uid,
//           name: currentUser.displayName || '',
//           phone: '', // Phone number isn't typically stored in basic Firebase Auth
//           email: currentUser.email || '',
//           defaultAddress: '',
//           createdAt: currentUser.metadata?.creationTime || new Date().toISOString(),
//         });
        
//       } else {
//         setUser(null);
//         navigate("/admin/login");
//       }
//     });

//     return () => unsubscribe();
//   }, [navigate]);

//   useEffect(() => {
//     const fetchUserDoc = async () => {
//       try {
//         if (!user || !user.email) return;
//         setIsLoading(true);
//         const usersRef = collection(db, "Users");
//         const q = query(usersRef, where("email", "==", user.email));
//         const querySnapshot = await getDocs(q);

//         if (!querySnapshot.empty) {
//           const userData = querySnapshot.docs[0].data();
//           setFormData({
//             name: userData.name || user.displayName || '',
//             phone: userData.phone || '',
//             email: userData.email || user.email || '',
//             defaultAddress: userData.defaultAddress || '',
//             createdAt: userData.createdAt,
//             updatedAt: userData.updatedAt
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching user document:", error);
//         Swal.fire({
//           title: "Error",
//           text: "Failed to load profile information. Please refresh the page.",
//           icon: "error"
//         });
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchUserDoc();
//   }, [user]);
  
//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     const { name, value } = e.target;
//     setFormData({
//       ...formData,
//       [name]: value
//     });
//   };
  
//   const saveProfile = async () => {
//     if (!formData.name || !formData.phone || !formData.email) {
//       Swal.fire({
//         title: "Missing Information",
//         text: "Please fill in all required fields",
//         icon: "warning"
//       });
//       return;
//     }
    
//     try {
//       setIsSaving(true);
      
//       if (user) {
//         // Update displayName in Firebase Auth
//         if (auth.currentUser) {
//           await updateProfile(auth.currentUser, { 
//             displayName: formData.name 
//           });
//         }
        
//         // Update or create user document in Firestore
//         const userDocRef = doc(db, "Users", user.uid);
//         const userDocSnap = await getDoc(userDocRef);
        
//         if (userDocSnap.exists()) {
//           // Document exists, update it
//           await updateDoc(userDocRef, {
//             name: formData.name,
//             phone: formData.phone,
//             email: formData.email,
//             defaultAddress: formData.defaultAddress,
//             updatedAt: serverTimestamp()
//           });
//         } else {
//           // Document doesn't exist, create it
//           await setDoc(userDocRef, {
//             name: formData.name,
//             phone: formData.phone,
//             email: formData.email,
//             defaultAddress: formData.defaultAddress || '',
//             createdAt: serverTimestamp(),
//             updatedAt: serverTimestamp()
//           });
//         }
//       }
      
//       setIsEditing(false);
      
//       Swal.fire({
//         title: "Success",
//         text: "Profile updated successfully",
//         icon: "success"
//       });
//     } catch (error) {
//       console.error("Error updating profile:", error);
//       Swal.fire({
//         title: "Error",
//         text: "Failed to update profile. Please try again.",
//         icon: "error"
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };
  
//   // Format date for display
//   const formatDate = (dateString: string | undefined) => {
//     if (!dateString) return "Not available";
//     try {
//       const date = new Date(dateString);
//       return format(date, "MMMM d, yyyy");
//     } catch (error) {
//       return "Not available";
//     }
//   };
  
//   // Show loading state
//   if (isLoading || !user) {
//     return (
//       <div className="max-w-2xl mx-auto p-8">
//         <Card className="bg-white">
//           <CardContent className="py-12">
//             <div className="flex flex-col items-center justify-center space-y-4">
//               <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-primary"></div>
//               <p className="text-muted-foreground">Loading profile information...</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }
  
//   return (
//     <div className="max-w-2xl mx-auto p-4">
//       <Card className="bg-white shadow-md">
//         <CardHeader className="border-b">
//           <div className="flex justify-between items-center">
//             <div className="flex items-center gap-3">
//               <div className="bg-primary/10 p-2 rounded-full">
//                 <UserIcon className="size-6 text-primary" />
//               </div>
//               <div>
//                 <CardTitle className="text-2xl">My Profile</CardTitle>
//                 <CardDescription>Manage your personal information</CardDescription>
//               </div>
//             </div>
//             {!isEditing && (
//               <Button 
//                 onClick={() => setIsEditing(true)}
//                 variant="outline"
//                 className="h-9"
//               >
//                 Edit Profile
//               </Button>
//             )}
//           </div>
//         </CardHeader>
        
//         <CardContent className="pt-6 pb-2">
//           {isEditing ? (
//             <div className="space-y-5">
//               <div className="grid gap-2">
//                 <Label htmlFor="name" className="text-sm font-medium">
//                   Full Name <span className="text-red-500">*</span>
//                 </Label>
//                 <Input 
//                   id="name" 
//                   name="name" 
//                   value={formData.name} 
//                   onChange={handleChange} 
//                   placeholder="Your full name" 
//                   required 
//                   className="h-10"
//                 />
//               </div>
              
//               <div className="grid gap-2">
//                 <Label htmlFor="phone" className="text-sm font-medium">
//                   Phone Number <span className="text-red-500">*</span>
//                 </Label>
//                 <Input 
//                   id="phone" 
//                   name="phone" 
//                   value={formData.phone} 
//                   onChange={handleChange} 
//                   placeholder="10-digit phone number" 
//                   required 
//                   className="h-10"
//                 />
//               </div>
              
//               <div className="grid gap-2">
//                 <Label htmlFor="email" className="text-sm font-medium">
//                   Email Address <span className="text-red-500">*</span>
//                 </Label>
//                 <Input 
//                   id="email" 
//                   name="email" 
//                   type="email" 
//                   value={formData.email} 
//                   placeholder="your@email.com" 
//                   required 
//                   disabled
//                   className="h-10 bg-gray-50"
//                 />
//                 <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
//               </div>
              
//               <div className="grid gap-2">
//                 <Label htmlFor="defaultAddress" className="text-sm font-medium">
//                   Default Delivery Address
//                 </Label>
//                 <Textarea 
//                   id="defaultAddress" 
//                   name="defaultAddress" 
//                   value={formData.defaultAddress || ''} 
//                   onChange={handleChange} 
//                   placeholder="Your default delivery address" 
//                   rows={3} 
//                   className="resize-none"
//                 />
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-4">
//                   <div className="flex items-start gap-3">
//                     <UserIcon className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
//                     <div>
//                       <p className="text-sm font-medium text-gray-500">Full Name</p>
//                       <p className="text-base font-medium">{formData.name || 'Not set'}</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex items-start gap-3">
//                     <Phone className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
//                     <div>
//                       <p className="text-sm font-medium text-gray-500">Phone Number</p>
//                       <p className="text-base font-medium">{formData.phone || 'Not set'}</p>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="space-y-4">
//                   <div className="flex items-start gap-3">
//                     <Mail className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
//                     <div>
//                       <p className="text-sm font-medium text-gray-500">Email Address</p>
//                       <p className="text-base font-medium">{formData.email || 'Not set'}</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex items-start gap-3">
//                     <Calendar className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
//                     <div>
//                       <p className="text-sm font-medium text-gray-500">Member Since</p>
//                       <p className="text-base font-medium">
//                         {formatDate(formData.createdAt?.toDate?.() ? formData.createdAt.toDate().toISOString() : formData.createdAt)}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               <div className="flex items-start gap-3 pt-2 border-t">
//                 <MapPin className="size-5 text-gray-500 mt-0.5 flex-shrink-0" />
//                 <div>
//                   <p className="text-sm font-medium text-gray-500">Default Delivery Address</p>
//                   <p className="text-base font-medium whitespace-pre-wrap">
//                     {formData.defaultAddress || 'No address set'}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}
//         </CardContent>
        
//         {isEditing && (
//           <CardFooter className="flex justify-end gap-3 border-t pt-4 mt-4">
//             <Button 
//               variant="outline" 
//               onClick={() => {
//                 // Reset form data to current user values
//                 setFormData({
//                   id: user.uid,
//                   name: user.displayName || '',
//                   phone: formData.phone,
//                   email: user.email || '',
//                   defaultAddress: formData.defaultAddress || '',
//                   createdAt: formData.createdAt,
//                   updatedAt: formData.updatedAt
//                 });
//                 setIsEditing(false);
//               }}
//               className="h-9"
//               disabled={isSaving}
//             >
//               Cancel
//             </Button>
//             <Button 
//               onClick={saveProfile}
//               disabled={isSaving}
//               className="h-9"
//             >
//               {isSaving ? (
//                 <span className="flex items-center gap-2">
//                   <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"></div>
//                   Saving...
//                 </span>
//               ) : (
//                 'Save Changes'
//               )}
//             </Button>
//           </CardFooter>
//         )}
//       </Card>
//     </div>
//   );
// };

// export default ProfilePage;