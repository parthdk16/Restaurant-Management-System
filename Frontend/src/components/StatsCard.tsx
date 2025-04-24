import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, ListOrdered, Soup, UsersRound } from "lucide-react";

interface StatsCardProps {
  title: string;
  width?: string;
  height?: string;
  count?: number;
  icon?: string;
}

export function StatsCard({ title, count, icon }: StatsCardProps) {
  return (
    <Card 
      // style={{ width, height }} 
      className="w-full h-auto rounded-lg border bg-card text-card-foreground shadow-sm transition hover:shadow-md hover:scale-105 hover:shadow-lg hover:border hover:border-black dark:hover:border-white"
    >
      <CardHeader>
        <CardTitle className="tracking-tight text-sm font-medium flex justify-between items-center w-full">
          <span>{title}</span>
          {icon === "UsersRound" && (<UsersRound className="text-muted-foreground h-4 w-4"/>)}
          {icon === "Soup" && (<Soup className="text-muted-foreground h-4 w-4"/>)}
          {icon === "ListOrdered" && (<ListOrdered className="text-muted-foreground h-4 w-4"/>)}
          {icon === "IndianRupee" && (<IndianRupee className="text-muted-foreground h-4 w-4"/>)}

        </CardTitle>
        {count === 0 || count === undefined ? (
          <div className="flex justify-center items-center mt-2">
            {/* <Skeleton className="h-6 w-full" /> */}
            <p className="text-xl font-semibold text-primary text-center">{count}</p>
          </div>
        ) : (
          <p className="mt-2 text-xl font-semibold text-primary text-center">{count}</p>
        )}
      </CardHeader>
    </Card>
  );
}
