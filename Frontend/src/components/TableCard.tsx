import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "./ui/input";

interface JobCardProps {
  id: string;
  tableNo: number;
  title: string;
  createdBy: string | null | undefined;
  createdAt: string;
  width?: string;
  height?: string;
  onDelete: (postId: string) => void;
}

export function TableCard({
  id,
  title,
  tableNo,
  createdBy,
  createdAt,
  onDelete
}: JobCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [items, setItems] = useState<string[]>([]);
    const [totalPrice, setTotalPrice] = useState<number | "">("");
    const [status, setStatus] = useState("pending");

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> 
        <DialogTrigger asChild>
          <Card 
              className="w-full min-w-[350px] min-h-[200px] max-w-[350px] rounded-lg border bg-white text-gray-800 shadow-sm cursor-pointer transition-transform duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg hover:border hover:border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 flex flex-col justify-between"
              onClick={() => setIsDialogOpen(true)}
          >
            <CardHeader className="flex-grow flex items-center justify-center p-4">
              <CardTitle className="text-center tracking-tight text-3xl font-semibold">
                {title}
              </CardTitle>
            </CardHeader>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-600">
              <Trash2
                className="text-gray-500 hover:text-red-600 cursor-pointer transition-colors duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
              />
              <Button
                variant="ghost"
                className="flex items-center gap-1 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/view/${id}`, '_blank');
                }}
              >
                Edit Order <Pencil className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </DialogTrigger>

        <DialogContent className="p-6 max-w-3xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold mb-4">{title}</DialogTitle>
          </DialogHeader>
          <Separator className="absolute top-20 left-0 w-full" />
          <ScrollArea className="max-h-[410px] p-4">
          <div className="space-y-4 mb-4">
          </div>

        </ScrollArea>
          <div className="m-auto">
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
                    <Button variant="outline" className="mt-4">
                      Submit Order
                    </Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}