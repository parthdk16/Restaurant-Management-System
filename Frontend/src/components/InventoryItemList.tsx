// InventoryItemList.tsx
import { FC, useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";
import { db, auth } from "../Database/FirebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Search, Filter, Plus, Edit, Trash2, MoreHorizontal, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import Loader1 from "@/components/Loader";
import { InventoryItem, InventoryItemForm } from "./ManageInventory";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigate } from "react-router-dom";

interface FilterOptions {
  category: string;
  lowStock: boolean;
  nearExpiry: boolean;
  searchQuery: string;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const InventoryItemList: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    category: "",
    lowStock: false,
    nearExpiry: false,
    searchQuery: ""
  });
  const { toast } = useToast();
  const { theme } = useTheme();
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
        } else {
          setUser(null);
          navigate("/admin/login");
        }
      });
  
      return () => unsubscribe();
    }, [navigate]);

  const sweetAlertOptions: Record<string, unknown> = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  const fetchInventoryItems = useCallback(async () => {
    try {
      setLoading(true);
      const inventoryCollection = collection(db, "Inventory");
      const inventorySnapshot = await getDocs(inventoryCollection);
      const inventoryList = inventorySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastRestocked: doc.data().lastRestocked?.toDate() || new Date(),
        expiryDate: doc.data().expiryDate?.toDate() || null
      })) as InventoryItem[];
      
      setInventoryItems(inventoryList);
      setFilteredItems(inventoryList);
    } catch (error) {
      console.error("Error fetching inventory items: ", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]);

  useEffect(() => {
    let result = [...inventoryItems];
    
    // Filter by search query
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.vendor.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (filterOptions.category) {
      result = result.filter(item => item.category === filterOptions.category);
    }
    
    // Filter by low stock
    if (filterOptions.lowStock) {
      result = result.filter(item => item.quantity <= item.minStockLevel);
    }
    
    // Filter by near expiry (within 7 days)
    if (filterOptions.nearExpiry) {
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      result = result.filter(item => 
        item.expiryDate && 
        item.expiryDate > today && 
        item.expiryDate <= sevenDaysFromNow
      );
    }
    
    setFilteredItems(result);
  }, [inventoryItems, filterOptions]);

  const handleDelete = async (itemId: string, itemName: string) => {
    Swal.fire({
      ...sweetAlertOptions,
      title: "Are you sure?",
      text: `Do you want to delete ${itemName} from inventory?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "No, keep it"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const currentUser = auth.currentUser;
          const itemToDelete = inventoryItems.find(item => item.id === itemId);
          
          if (!itemToDelete) {
            return;
          }
          
          // Delete the inventory item
          await deleteDoc(doc(db, "Inventory", itemId));
          
          // Create history record
          await addDoc(collection(db, "InventoryHistory"), {
            itemName: itemToDelete.name,
            action: "delete",
            previousQuantity: itemToDelete.quantity,
            quantity: -itemToDelete.quantity,
            timestamp: new Date(),
            updatedBy: currentUser?.displayName || currentUser?.email || "Unknown user"
          });
          
          toast({
            title: "Success",
            description: `${itemName} has been deleted from inventory`,
          });
          
          // Refresh the inventory list
          fetchInventoryItems();
        } catch (error) {
          console.error("Error deleting inventory item: ", error);
          toast({
            title: "Error",
            description: "Failed to delete inventory item",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleUpdateQuantity = async (item: InventoryItem, action: "increment" | "decrement", amount: number) => {
    try {
      const currentUser = auth.currentUser;
      const newQuantity = action === "increment" 
        ? item.quantity + amount 
        : Math.max(0, item.quantity - amount);
      
      // Update quantity in Firestore
      await updateDoc(doc(db, "Inventory", item.id), {
        quantity: newQuantity,
        lastRestocked: action === "increment" ? new Date() : item.lastRestocked,
        updatedAt: new Date(),
        updatedBy: currentUser?.displayName || currentUser?.email || "Unknown user"
      });
      
      // Create history record
      await addDoc(collection(db, "InventoryHistory"), {
        itemName: item.name,
        action: action === "increment" ? "add" : "remove",
        previousQuantity: item.quantity,
        quantity: action === "increment" ? amount : -amount,
        timestamp: new Date(),
        updatedBy: currentUser?.displayName || currentUser?.email || "Unknown user"
      });
      
      toast({
        title: "Success",
        description: `${item.name} quantity updated successfully`,
      });
      
      // Refresh the inventory list
      fetchInventoryItems();
    } catch (error) {
      console.error("Error updating quantity: ", error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setIsEditDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterOptions({
      category: "",
      lowStock: false,
      nearExpiry: false,
      searchQuery: ""
    });
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    } else if (item.quantity <= item.minStockLevel) {
      return { label: "Low Stock", variant: "warning" as const };
    } else {
      return { label: "In Stock", variant: "success" as const };
    }
  };

  const openAdjustmentDialog = (item: InventoryItem) => {
    Swal.fire({
      ...sweetAlertOptions,
      title: "Adjust Inventory",
      html: `
        <div>
          <label for="adjustment-type">Adjustment Type</label>
          <select id="adjustment-type" class="swal2-input">
            <option value="add">Add Stock</option>
            <option value="remove">Remove Stock</option>
          </select>
        </div>
        <div>
          <label for="adjustment-amount">Amount (${item.unit})</label>
          <input type="number" id="adjustment-amount" class="swal2-input" min="0.01" step="0.01">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Adjust',
      preConfirm: () => {
        const type = (document.getElementById('adjustment-type') as HTMLSelectElement).value;
        const amountStr = (document.getElementById('adjustment-amount') as HTMLInputElement).value;
        const amount = parseFloat(amountStr);
        
        if (!amount || amount <= 0) {
          Swal.showValidationMessage('Please enter a valid amount');
          return false;
        }
        
        return { type, amount };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { type, amount } = result.value as { type: string, amount: number };
        handleUpdateQuantity(item, type === 'add' ? 'increment' : 'decrement', amount);
      }
    });
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
          <Sidebar user={user} activePage="inventory" />
          <div className="flex flex-col h-screen">
            <Header />
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>Manage your restaurant inventory items</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[500px] pr-4">
                <InventoryItemForm 
                  isEditing={false}
                  onSubmit={() => {
                    setIsAddDialogOpen(false);
                    fetchInventoryItems();
                  }}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory items..."
                className="pl-8"
                value={filterOptions.searchQuery}
                onChange={(e) => setFilterOptions({...filterOptions, searchQuery: e.target.value})}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter size={16} /> Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={filterOptions.category} 
                      onValueChange={(value) => setFilterOptions({...filterOptions, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="vegetables">Vegetables</SelectItem>
                        <SelectItem value="fruits">Fruits</SelectItem>
                        <SelectItem value="dairy">Dairy</SelectItem>
                        <SelectItem value="meat">Meat</SelectItem>
                        <SelectItem value="seafood">Seafood</SelectItem>
                        <SelectItem value="spices">Spices</SelectItem>
                        <SelectItem value="grains">Grains & Rice</SelectItem>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="checkbox"
                      id="lowStock"
                      checked={filterOptions.lowStock}
                      onChange={(e) => setFilterOptions({...filterOptions, lowStock: e.target.checked})}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="lowStock">Low Stock Items</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="checkbox"
                      id="nearExpiry"
                      checked={filterOptions.nearExpiry}
                      onChange={(e) => setFilterOptions({...filterOptions, nearExpiry: e.target.checked})}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="nearExpiry">Near Expiry (7 days)</Label>
                  </div>
                  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={fetchInventoryItems} className="flex items-center gap-2">
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader1 />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No inventory items found</p>
              <Button 
                variant="link" 
                onClick={() => setIsAddDialogOpen(true)}
                className="mt-2"
              >
                Add your first item
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Last Restocked</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.location}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                        </TableCell>
                        <TableCell>₹{item.costPerUnit.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal size={16} />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                <Edit size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAdjustmentDialog(item)}>
                                <RefreshCw size={14} className="mr-2" /> Adjust Quantity
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(item.id, item.name)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px] pr-4">
            <InventoryItemForm 
              isEditing={true}
              editItem={editItem}
              onSubmit={() => {
                setIsEditDialogOpen(false);
                fetchInventoryItems();
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
    </main>
            {loading && <Loader1/>} 
          </div>
        </div>
  );
};