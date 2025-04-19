import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader1 from "./Loader";
import { auth, db } from "../Database/FirebaseConfig";
import { Sidebar } from "./Sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import Swal from 'sweetalert2';
import { useTheme } from './theme-provider';
import { Header } from "./Header";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface Transaction {
  id: string;
  orderId?: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'online' | 'wallet';
  paymentStatus: 'completed' | 'refunded' | 'failed' | 'pending';
  reference?: string;
  description?: string;
  createdAt: any; // Firestore timestamp
  createdBy?: string;
  type: 'payment' | 'refund' | 'adjustment';
  metadata?: {
    orderType?: 'dine-in' | 'takeaway' | 'delivery';
    tableNumber?: string;
    cardLast4?: string;
    transactionId?: string;
  };
}

export const TransactionHistory: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { theme } = useTheme();

  useEffect(() => {
      document.title = 'Transactions - Hotel Shripad';
    }, []);

  const sweetAlertOptions = useMemo(() => ({
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  }), [theme]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const transactionsCollection = collection(db, "Transactions");
      
      let transactionsQuery = query(transactionsCollection, orderBy("createdAt", "desc"));
      
      // Apply date range filter if it exists
      if (dateRange.from && dateRange.to) {
        const fromDate = Timestamp.fromDate(dateRange.from);
        const toDate = Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999)));
        transactionsQuery = query(transactionsQuery, 
          where("createdAt", ">=", fromDate),
          where("createdAt", "<=", toDate)
        );
      }
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsList = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      
      setTransactions(transactionsList);
    } catch (error) {
      console.error("Error fetching transactions: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to fetch transactions. Please try again.",
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [sweetAlertOptions, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsDialogOpen(true);
  };

  const getStatusBadgeColors = (status: Transaction['paymentStatus']) => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case 'refunded':
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case 'failed':
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getTypeBadgeColors = (type: Transaction['type']) => {
    switch (type) {
      case 'payment':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case 'refund':
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case 'adjustment':
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.orderId && transaction.orderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPaymentMethod = paymentMethodFilter ? transaction.paymentMethod === paymentMethodFilter : true;
    const matchesStatus = statusFilter ? transaction.paymentStatus === statusFilter : true;
    const matchesType = typeFilter ? transaction.type === typeFilter : true;
    
    return matchesSearch && matchesPaymentMethod && matchesStatus && matchesType;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setPaymentMethodFilter(null);
    setStatusFilter(null);
    setTypeFilter(null);
    setDateRange({
      from: undefined,
      to: undefined
    });
  };

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ["Transaction ID", "Date", "Customer", "Amount", "Type", "Payment Method", "Status", "Reference", "Description"];
      const csvRows = [headers];
      
      filteredTransactions.forEach(transaction => {
        const row = [
          transaction.id,
          formatDate(transaction.createdAt),
          transaction.customerName,
          transaction.amount.toFixed(2),
          transaction.type,
          transaction.paymentMethod,
          transaction.paymentStatus,
          transaction.reference || '',
          transaction.description || ''
        ];
        csvRows.push(row);
      });
      
      // Convert to CSV string
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Swal.fire({
        ...sweetAlertOptions,
        title: "Success!",
        text: "Transactions exported successfully!",
        icon: "success"
      });
    } catch (error) {
      console.error("Error exporting transactions: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Failed to export transactions. Please try again.",
        icon: "error"
      });
    }
  };

  // Calculate total amounts
  const totalTransactionAmount = filteredTransactions.reduce((total, transaction) => {
    if (transaction.type === 'payment') {
      return total + transaction.amount;
    } else if (transaction.type === 'refund') {
      return total - transaction.amount;
    } else {
      return total + (transaction.type === 'adjustment' ? transaction.amount : 0);
    }
  }, 0);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      <Sidebar user={user} activePage="transaction-history" />
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h1 className="text-2xl text-primary font-bold">Transaction History</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchTransactions}>
                Refresh
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="size-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-500">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{filteredTransactions.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-500">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₹{totalTransactionAmount.toFixed(2)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-500">Average Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ₹{filteredTransactions.length > 0 
                    ? (filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) / filteredTransactions.length).toFixed(2) 
                    : "0.00"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by name, transaction ID, or reference"
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={paymentMethodFilter || "all"} onValueChange={(value) => setPaymentMethodFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto justify-start">
                  <Calendar className="mr-2 size-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  initialFocus
                />
                <div className="flex items-center justify-between p-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: undefined, to: undefined })}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={() => fetchTransactions()}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {(searchTerm || paymentMethodFilter || statusFilter || typeFilter || dateRange.from) && (
              <Button variant="ghost" onClick={handleClearFilters} className="whitespace-nowrap w-full md:w-auto">
                <Filter className="size-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Transactions List */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
              <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <TransactionsTable 
                transactions={filteredTransactions} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                getStatusBadgeColors={getStatusBadgeColors}
                getTypeBadgeColors={getTypeBadgeColors}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="payments" className="mt-4">
              <TransactionsTable 
                transactions={filteredTransactions.filter(transaction => transaction.type === 'payment')} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                getStatusBadgeColors={getStatusBadgeColors}
                getTypeBadgeColors={getTypeBadgeColors}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="refunds" className="mt-4">
              <TransactionsTable 
                transactions={filteredTransactions.filter(transaction => transaction.type === 'refund')} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                getStatusBadgeColors={getStatusBadgeColors}
                getTypeBadgeColors={getTypeBadgeColors}
                formatDate={formatDate}
              />
            </TabsContent>
            <TabsContent value="adjustments" className="mt-4">
              <TransactionsTable 
                transactions={filteredTransactions.filter(transaction => transaction.type === 'adjustment')} 
                loading={loading} 
                onViewDetails={handleViewDetails}
                getStatusBadgeColors={getStatusBadgeColors}
                getTypeBadgeColors={getTypeBadgeColors}
                formatDate={formatDate}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Transaction #{selectedTransaction.id.slice(-6)}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedTransaction.createdAt)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getTypeBadgeColors(selectedTransaction.type)}>
                    {selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)}
                  </Badge>
                  <Badge className={getStatusBadgeColors(selectedTransaction.paymentStatus)}>
                    {selectedTransaction.paymentStatus.charAt(0).toUpperCase() + selectedTransaction.paymentStatus.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p><span className="font-medium">Name:</span> {selectedTransaction.customerName}</p>
                    {selectedTransaction.orderId && (
                      <p><span className="font-medium">Order ID:</span> #{selectedTransaction.orderId.slice(-6)}</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p>
                      <span className="font-medium">Method:</span> 
                      {selectedTransaction.paymentMethod.charAt(0).toUpperCase() + selectedTransaction.paymentMethod.slice(1)}
                    </p>
                    <p>
                      <span className="font-medium">Amount:</span> 
                      ₹{selectedTransaction.amount.toFixed(2)}
                    </p>
                    {selectedTransaction.reference && (
                      <p><span className="font-medium">Reference:</span> {selectedTransaction.reference}</p>
                    )}
                    {selectedTransaction.metadata?.cardLast4 && (
                      <p><span className="font-medium">Card:</span> **** **** **** {selectedTransaction.metadata.cardLast4}</p>
                    )}
                    {selectedTransaction.metadata?.transactionId && (
                      <p><span className="font-medium">Transaction ID:</span> {selectedTransaction.metadata.transactionId}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {(selectedTransaction.description || selectedTransaction.metadata?.orderType || selectedTransaction.metadata?.tableNumber) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {selectedTransaction.description && (
                      <p><span className="font-medium">Description:</span> {selectedTransaction.description}</p>
                    )}
                    {selectedTransaction.metadata?.orderType && (
                      <p>
                        <span className="font-medium">Order Type:</span> 
                        {selectedTransaction.metadata.orderType.charAt(0).toUpperCase() + selectedTransaction.metadata.orderType.slice(1)}
                      </p>
                    )}
                    {selectedTransaction.metadata?.tableNumber && (
                      <p><span className="font-medium">Table Number:</span> {selectedTransaction.metadata.tableNumber}</p>
                    )}
                    {selectedTransaction.createdBy && (
                      <p><span className="font-medium">Created By:</span> {selectedTransaction.createdBy}</p>
                    )}
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

// Helper component for transactions table
const TransactionsTable: FC<{
  transactions: Transaction[];
  loading: boolean;
  onViewDetails: (transaction: Transaction) => void;
  getStatusBadgeColors: (status: Transaction['paymentStatus']) => string;
  getTypeBadgeColors: (type: Transaction['type']) => string;
  formatDate: (timestamp: any) => string;
}> = ({ 
  transactions, 
  loading, 
  onViewDetails, 
  getStatusBadgeColors,
  getTypeBadgeColors,
  formatDate
}) => {
  if (loading) {
    return (
      <div className="w-full flex justify-center p-12">
        <Loader1 />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <p className="text-lg font-medium text-gray-600">No transactions found</p>
        <p className="text-gray-500">Try changing your filters or search term</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left">Transaction ID</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Method</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">#{transaction.id.slice(-6)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(transaction.createdAt)}</td>
              <td className="px-4 py-3">
                {transaction.customerName}<br />
                {transaction.orderId && (
                  <span className="text-sm text-gray-500">Order: #{transaction.orderId.slice(-6)}</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium">
                {transaction.type === 'refund' ? '-' : ''}
                ₹{transaction.amount.toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <Badge className={getTypeBadgeColors(transaction.type)}>
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">
                  {transaction.paymentMethod.charAt(0).toUpperCase() + transaction.paymentMethod.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge className={getStatusBadgeColors(transaction.paymentStatus)}>
                  {transaction.paymentStatus.charAt(0).toUpperCase() + transaction.paymentStatus.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => onViewDetails(transaction)}>
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};