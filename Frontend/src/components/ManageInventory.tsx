// InventoryItemForm.tsx
import { FC, useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../Database/FirebaseConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface InventoryItemFormProps {
  isEditing: boolean;
  editItem?: InventoryItem | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  minStockLevel: number;
  vendor: string;
  lastRestocked: Date;
  expiryDate?: Date;
  location?: string;
}

export const InventoryItemForm: FC<InventoryItemFormProps> = ({ isEditing, editItem, onSubmit, onCancel }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState("kg");
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(0);
  const [vendor, setVendor] = useState("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [location, setLocation] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setQuantity(editItem.quantity);
      setUnit(editItem.unit);
      setCostPerUnit(editItem.costPerUnit);
      setMinStockLevel(editItem.minStockLevel);
      setVendor(editItem.vendor);
      setLocation(editItem.location || "");
      if (editItem.expiryDate) {
        const date = new Date(editItem.expiryDate);
        setExpiryDate(date.toISOString().split('T')[0]);
      }
    } else {
      resetForm();
    }
  }, [isEditing, editItem]);

  const resetForm = () => {
    setName("");
    setCategory("");
    setQuantity(0);
    setUnit("kg");
    setCostPerUnit(0);
    setMinStockLevel(0);
    setVendor("");
    setExpiryDate("");
    setLocation("");
  };

  const handleSubmit = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (!name || !category || !unit || costPerUnit <= 0) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const itemData = {
        name,
        category,
        quantity: Number(quantity),
        unit,
        costPerUnit: Number(costPerUnit),
        minStockLevel: Number(minStockLevel),
        vendor,
        lastRestocked: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        location: location || null,
        updatedBy: currentUser?.displayName || currentUser?.email || "Unknown user",
        updatedAt: new Date()
      };

      if (isEditing && editItem) {
        // Update existing item
        await updateDoc(doc(db, "Inventory", editItem.id), itemData);
        
        // Create history record
        await addDoc(collection(db, "InventoryHistory"), {
          itemName: name,
          action: "update",
          previousQuantity: editItem.quantity,
          quantity: Number(quantity) - editItem.quantity,
          timestamp: new Date(),
          updatedBy: currentUser?.displayName || currentUser?.email || "Unknown user"
        });
        
        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        });
      } else {
        
        // Create history record
        await addDoc(collection(db, "InventoryHistory"), {
          itemName: name,
          action: "add",
          previousQuantity: 0,
          quantity: Number(quantity),
          timestamp: new Date(),
          updatedBy: currentUser?.displayName || currentUser?.email || "Unknown user"
        });
        
        toast({
          title: "Success",
          description: "Inventory item added successfully",
        });
      }

      resetForm();
      onSubmit();
    } catch (error) {
      console.error("Error submitting inventory item:", error);
      toast({
        title: "Error",
        description: "There was an error submitting the inventory item",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-left font-semibold">Item Name*</Label>
          <Input 
            type="text" 
            placeholder="Enter item name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-left font-semibold">Category*</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
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
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-left font-semibold">Quantity*</Label>
          <Input 
            type="number" 
            placeholder="Quantity" 
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-left font-semibold">Unit*</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
              <SelectItem value="g">Grams (g)</SelectItem>
              <SelectItem value="l">Liters (L)</SelectItem>
              <SelectItem value="ml">Milliliters (mL)</SelectItem>
              <SelectItem value="pcs">Pieces (pcs)</SelectItem>
              <SelectItem value="dozen">Dozen</SelectItem>
              <SelectItem value="packet">Packet</SelectItem>
              <SelectItem value="box">Box</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-left font-semibold">Cost Per Unit (₹)*</Label>
          <Input 
            type="number" 
            placeholder="Cost per unit" 
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(Number(e.target.value))}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-left font-semibold">Minimum Stock Level</Label>
          <Input 
            type="number" 
            placeholder="Minimum stock level" 
            value={minStockLevel}
            onChange={(e) => setMinStockLevel(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-left font-semibold">Vendor/Supplier</Label>
          <Input 
            type="text" 
            placeholder="Vendor/Supplier name" 
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-left font-semibold">Expiry Date</Label>
          <Input 
            type="date" 
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-left font-semibold">Storage Location</Label>
          <Input 
            type="text" 
            placeholder="Storage location" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleSubmit}>
          {isEditing ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </div>
  );
};