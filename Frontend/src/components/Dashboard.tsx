import { FC, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { auth, db } from "../Database/FirebaseConfig";
import { query, collection, where, getDocs } from "firebase/firestore";
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
  totalPosts: number;
  totalJobOpenings: number;
  applicationsCount: number;
  shortlistedCandidates: number;
  onboardCount: number;
  totalCandidates: number;
  archivedCandidates: number;
}

interface ChartData {
  month: string;
  totalPosts: number;
  totalJobOpenings: number;
}

export const Dashboard: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<Counts>({
    totalPosts: 0,
    totalJobOpenings: 0,
    applicationsCount: 0,
    shortlistedCandidates: 0,
    onboardCount: 0,
    totalCandidates: 0,
    archivedCandidates: 0,
  });
  const [loading, setLoading] = useState(false);
  const [areaChartData, setAreaChartData] = useState<ChartData[]>([]);

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
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {

      const jobOpeningsQuery = query(collection(db, "Posts"), where("publish", "==", true));

      const postsSnapshot = await getDocs(collection(db, "Posts"));
      const jobOpeningsSnapshot = await getDocs(jobOpeningsQuery);
      const applicationsSnapshot = await getDocs(collection(db, "CandidateInfo"));
      const shortlistedSnapshot = await getDocs(collection(db, "ShortlistedCandidatesData"));
      const onboardSnapshot = await getDocs(collection(db, "OnBoardingCandidates"));
      const archivedCandidatesSnapshot = await getDocs(collection(db, "ArchivedCandidatesData"));
      const totalCandidates = shortlistedSnapshot.size + applicationsSnapshot.size + archivedCandidatesSnapshot.size;

      setCounts({
        totalPosts: postsSnapshot.size,
        totalJobOpenings: jobOpeningsSnapshot.size,
        applicationsCount: applicationsSnapshot.size,
        shortlistedCandidates: shortlistedSnapshot.size,
        onboardCount: onboardSnapshot.size,
        totalCandidates: totalCandidates,
        archivedCandidates: archivedCandidatesSnapshot.size,
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

  const fetchPostCountsLast6Months = async () => {
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
    console.log('Querying database with: ', sixMonthsAgo.toISOString());
  
    const postsQuery = query(
      collection(db, "Posts"),
      where("createdAt", ">=", sixMonthsAgo)
    );
  
    const snapshot = await getDocs(postsQuery);
    console.log(snapshot.size, " posts found in the last 6 months");
  
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

  useEffect(() => {
    fetchPostCountsLast6Months().then((counts) => {
      if (counts) {
        const areaChartData = counts.postCounts.map((posts, idx) => ({
          month: new Date(new Date().setMonth(new Date().getMonth() - (5 - idx))).toLocaleString('default', { month: 'long' }),
          totalPosts: posts,
          totalJobOpenings: counts.publishedPostCounts[idx],
        }));
        console.log("Post counts for the last 6 months:", counts);
        console.log("Area chart data:", areaChartData);
        setAreaChartData(areaChartData);
      }
    });
  }, []);

  const chartData = [
    { category: "applied", count: counts.applicationsCount, fill: "hsl(var(--chart-1))" },
    { category: "shortlisted", count: counts.shortlistedCandidates, fill: "hsl(var(--chart-2))" },
  ]

  const chartConfig = {
    count: {
      label: "Candidates",
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
              Welcome back, {user?.displayName || "User"}
            </h1>
          </div>
          <div className=" grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
            <StatsCard title="Total Orders Served" count={counts.totalPosts} icon="ListOrdered" />
            <StatsCard title="Most-cooked Item" count={counts.onboardCount} icon="Soup" />
            <StatsCard title="Sale Today" count={counts.totalJobOpenings} icon="IndianRupee"/>
            <StatsCard title="Table Turns Today" count={counts.totalCandidates} icon="UsersRound" />
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
                Total customers ({counts.totalCandidates})
              </div>
            </CardFooter>
          </Card>
          <AreaChartComponent data={areaChartData} />
          </div>
        </main>
        {loading && <Loader1/>} 
      </div>
    </div>
  );
};