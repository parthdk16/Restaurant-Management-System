import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  desktop: {
    label: "Total Posts",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Total Job Openings",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface AreaChartComponentProps {
  data: {
    month: string;
    totalPosts: number;
    totalJobOpenings: number;
  }[];
}

export function AreaChartComponent({ data }: AreaChartComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Sales Overview</CardTitle>
        <CardDescription>
          Most-served items and sale trends in last 6 month  
        </CardDescription>
      </CardHeader>
      <CardContent className="place-self-center">
        <ChartContainer config={chartConfig} className="h-[250px] max-h-[250px]">
          <AreaChart
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillPosts" x1="0" y1="0" x2="10" y2="1">
                <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillJobOpenings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="totalJobOpenings"
              type="natural"
              fill="url(#fillJobOpenings)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="totalPosts"
              type="natural"
              fill="url(#fillPosts)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="place-self-center">
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Last 6 months
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}