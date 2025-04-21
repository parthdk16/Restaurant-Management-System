import { FC, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { auth, db } from "../Database/FirebaseConfig";
import { query, collection, where, getDocs, Timestamp } from "firebase/firestore";
import { Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { AreaChartComponent } from "./AreaChart";
import Loader1 from "./Loader";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface Counts {
  totalOrders: number;
  mostCookedItem: number;
  tableTurnsToday: number;
}

interface ChartData {
  month: string;
  sales: number;
}

export const Dashboard: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<Counts>({
    totalOrders: 0,
    mostCookedItem: 0,
    tableTurnsToday: 0,
  });
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [areaChartData, setAreaChartData] = useState<ChartData[]>([]);
  const [transactionChartData, setTransactionChartData] = useState<ChartData[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
      document.title = 'Dashboard - Hotel Shripad';
    }, []);

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

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {

      const orderSnapshot = await getDocs(collection(db, "Orders"));
      const cookedItemSnapshot = await getDocs(collection(db, "Orders"));
      const tableTurnSnapshot = await getDocs(collection(db, "TableTurns"));

      setCounts({
        totalOrders: orderSnapshot.size,
        mostCookedItem: cookedItemSnapshot.size,
        tableTurnsToday: tableTurnSnapshot.size,
      });

    } catch (error) {
      console.error("Error fetching counts: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const fetchOrderCountLast6Months = async () => {
    const currentDate = new Date();
    const postCounts = new Array(6).fill(0);
    const publishedPostCounts = new Array(6).fill(0);
  
    const monthStartDates = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1);
      return date;
    });
  
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    // console.log('Querying database with: ', sixMonthsAgo.toISOString());
  
    const postsQuery = query(
      collection(db, "Posts"),
      where("createdAt", ">=", sixMonthsAgo)
    );
  
    const snapshot = await getDocs(postsQuery);
    // console.log(snapshot.size, " posts found in the last 6 months");
  
    snapshot.forEach((doc) => {
      const post = doc.data();
      const createdAtDate = new Date(post.createdAt.seconds * 1000);
  
      for (let i = 0; i < 6; i++) {
        const startDate = monthStartDates[i];
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);

        if (createdAtDate >= startDate && createdAtDate < endDate) {
          postCounts[i]++;
          console.log('Post belongs to month: ', i);

          if (post.publish === true) {
            publishedPostCounts[i]++;
            console.log('Published post belongs to month: ', i);
          }
          break;
        }
      }
    });

    return {
      postCounts: postCounts.reverse(),
      publishedPostCounts: publishedPostCounts.reverse()
    };
  }

  const fetchTransactionsLast6Months = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      const transactionAmounts = new Array(6).fill(0);
      
      const monthStartDates = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1);
        return date;
      });
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);
      
      const transactionsQuery = query(
        collection(db, "Transactions"),
        where("createdAt", ">=", Timestamp.fromDate(sixMonthsAgo))
      );
      
      const snapshot = await getDocs(transactionsQuery);
      console.log(snapshot.size, " transactions found in the last 6 months");
      
      snapshot.forEach((doc) => {
        const transaction = doc.data();
        const createdAtDate = new Date(transaction.createdAt.seconds * 1000);
        const amount = transaction.amount || 0;
        
        for (let i = 0; i < 6; i++) {
          const startDate = monthStartDates[i];
          const endDate = new Date(startDate);
          endDate.setMonth(startDate.getMonth() + 1);
          
          if (createdAtDate >= startDate && createdAtDate < endDate) {
            transactionAmounts[i] += amount;
            break;
          }
        }
      });
      
      // Create chart data with month names and transaction amounts
      const chartData = transactionAmounts.reverse().map((amount, idx) => ({
        month: new Date(new Date().setMonth(new Date().getMonth() - (5 - idx))).toLocaleString('default', { month: 'long' }),
        sales: amount,
      }));
      
      setTransactionChartData(chartData);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderCountLast6Months().then((counts) => {
      if (counts) {
        const areaChartData = counts.postCounts.map((posts, idx) => ({
          month: new Date(new Date().setMonth(new Date().getMonth() - (5 - idx))).toLocaleString('default', { month: 'long' }),
          sales: posts,
        }));
        // console.log("Post counts for the last 6 months:", counts);
        // console.log("Area chart data:", areaChartData);
        setAreaChartData(areaChartData);
      }
    });
    
    // Fetch transaction data for the last 6 months
    fetchTransactionsLast6Months();
  }, []);

  useEffect(() => {
    const sumTodaysTransactions = async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const transactionsQuery = query(
        collection(db, "Transactions"),
        where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
        where("createdAt", "<=", Timestamp.fromDate(endOfDay))
      );

      try {
        const querySnapshot = await getDocs(transactionsQuery);
        let total = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          total += data.amount || 0; // Ensure to handle cases where amount might be undefined
        });

        setTotalAmount(total); // Set the total amount in state
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false); // Set loading to false after fetching
      }
    };

    sumTodaysTransactions();
  }, []);

  const chartData = [
    { category: "new", count: counts.mostCookedItem, fill: "hsl(var(--chart-1))" },
    { category: "returning", count: counts.totalOrders, fill: "hsl(var(--chart-2))" },
  ]

  const chartConfig = {
    count: {
      label: "Customers",
    },
    shortlisted: {
      label: "Returning",
      color: "hsl(var(--chart-2))",
    },
    applied: {
      label: "New",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      <Sidebar user={user} activePage="dashboard" />
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-primary font-bold">
              Welcome, {user?.displayName?.split(' ')[0] || "User"}!
            </h1>
          </div>
          <div className=" grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
            <StatsCard title="Total Orders Served" count={counts.totalOrders} icon="ListOrdered" />
            <StatsCard title="Most-cooked Item" count={counts.mostCookedItem} icon="Soup" />
            <StatsCard title="Sale Today" count={totalAmount} icon="IndianRupee"/>
            <StatsCard title="Table Turns Today" count={counts.tableTurnsToday} icon="UsersRound" />
          </div>
          <div className="grid gap-4 md:gap-8 grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Customer Overview</CardTitle>
                <CardDescription>New and returning customers</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[300px] pb-0 text-lg"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="category" hideLabel={false} />}
                    />
                    <Pie
                      data={chartData}
                      dataKey="count"
                      label
                      nameKey="category"
                      stroke="none"
                    />
                    <ChartLegend
                          content={<ChartLegendContent nameKey="category" />}
                          className="text-sm -translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                        />
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                  Total customers ({counts.totalOrders + counts.mostCookedItem})
                </div>
              </CardFooter>
            </Card>
            <AreaChartComponent data={transactionChartData} />
          </div>
          {/* <div className="grid gap-4 md:gap-8 grid-cols-1">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Posts Overview</CardTitle>
                <CardDescription>Post activity over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChartComponent data={areaChartData} />
              </CardContent>
            </Card>
          </div> */}
        </main>
        {loading && <Loader1/>} 
      </div>
    </div>
  );
};