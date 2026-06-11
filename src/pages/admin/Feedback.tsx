import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Star, MessageSquare, Heart, ThumbsUp, Calendar } from "lucide-react";

interface FeedbackItem {
  _id: string;
  projectName: string;
  clientName: string;
  clientCompany: string;
  rating: number;
  comments: string;
  recommendRating: number;
  createdAt: string;
}

interface FeedbackResp {
  data: FeedbackItem[];
  stats: {
    totalCount: number;
    averageRating: number;
    recommendAverage: number;
    satisfactionRate: number;
    ratingCounts: Record<number, number>;
  };
}

export default function AdminFeedback() {
  const { data: feedbackData, isLoading } = useQuery<FeedbackResp>({
    queryKey: ["admin-feedback-list"],
    queryFn: () => apiFetch<FeedbackResp>("/feedback"),
    refetchInterval: 5000, // Refresh every 5s for live updates
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-72 sm:h-80 w-full" />
          <Skeleton className="col-span-1 h-72 sm:h-80 w-full" />
        </div>
      </div>
    );
  }

  const feedbacks = feedbackData?.data ?? [];
  const stats = feedbackData?.stats ?? {
    totalCount: 0,
    averageRating: 0,
    recommendAverage: 0,
    satisfactionRate: 100,
    ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };

  // Convert Mongoose ratingCounts to array format for Recharts
  const chartData = [
    { name: "5 Stars", count: stats.ratingCounts[5] || 0, fill: "#10b981" },
    { name: "4 Stars", count: stats.ratingCounts[4] || 0, fill: "#3b82f6" },
    { name: "3 Stars", count: stats.ratingCounts[3] || 0, fill: "#eab308" },
    { name: "2 Stars", count: stats.ratingCounts[2] || 0, fill: "#f97316" },
    { name: "1 Star",  count: stats.ratingCounts[1] || 0, fill: "#ef4444" },
  ].reverse();

  const statCards = [
    {
      title: "Average Rating",
      value: `${stats.averageRating} / 5`,
      sub: "out of 5 stars total",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Satisfaction Rate",
      value: `${stats.satisfactionRate}%`,
      sub: "4 & 5 star reviews share",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/10"
    },
    {
      title: "Recommend Score",
      value: `${stats.recommendAverage} / 10`,
      sub: "willingness to recommend",
      icon: ThumbsUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Total Reviews",
      value: stats.totalCount,
      sub: "submitted feedback forms",
      icon: MessageSquare,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 sm:space-y-8"
    >
      
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Client Feedback</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor your customer satisfaction reviews, service ratings, and business recommendations.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="border-border/50 shadow-sm">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground truncate uppercase tracking-wider">{card.title}</p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mt-1.5 text-foreground truncate">{card.value}</h3>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{card.sub}</p>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rating Distribution Chart (col-span-2) */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg font-serif">Rating Distribution</CardTitle>
            <CardDescription className="text-xs">Visualizing review frequencies across star rating levels</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="h-56 sm:h-64 w-full">
              {stats.totalCount > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                    <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={60} />
                    <Tooltip
                      cursor={{ fill: "rgba(120, 120, 120, 0.08)" }}
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: number) => [`${val} reviews`, "Count"]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                      {chartData.map((entry, index) => (
                        <rect key={`rect-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No review details available yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Highlight Stats Info Box (col-span-1) */}
        <Card className="lg:col-span-1 border-border/50 shadow-sm bg-gradient-to-br from-primary/[0.04] via-indigo-500/[0.01] to-transparent">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-serif">Satisfaction Insights</CardTitle>
            <CardDescription className="text-xs">Summary of overall loyalty index metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-4 bg-card rounded-xl border border-border/60 space-y-3 shadow-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Client satisfaction rate</span>
                <span className="font-bold text-emerald-500">{stats.satisfactionRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.satisfactionRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <h4 className="font-semibold text-xs text-foreground uppercase tracking-widest leading-none">Net Promoter Metric</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your average recommendation score is <span className="font-bold text-primary">{stats.recommendAverage}/10</span>. An average score above 8.5 indicates outstanding client advocacy and reference potential.
              </p>
            </div>
            
            <div className="pt-2 border-t text-[11px] text-muted-foreground/80 leading-relaxed">
              When projects reach 100% completion in updates, a feedback email trigger links clients directly to their project review page.
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Feedback Card Grid List */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif font-bold text-foreground">Feedback Reviews</h2>
        
        {feedbacks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center text-muted-foreground text-sm">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No feedback reviews submitted yet.</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Form invites will be sent out as active client projects are completed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map((f) => (
              <Card key={f._id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                
                {/* Visual Accent border based on star rating */}
                <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${
                  f.rating >= 4 ? "bg-emerald-500" :
                  f.rating === 3 ? "bg-yellow-500" :
                  "bg-red-500"
                }`} />

                <CardContent className="p-5 pl-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    
                    {/* Header: Stars & Recommendation */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < f.rating 
                                ? "fill-amber-400 text-amber-400" 
                                : "text-zinc-200 dark:text-zinc-800"
                            }`} 
                          />
                        ))}
                      </div>
                      <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium">
                        Recommend: {f.recommendRating || 10}/10
                      </Badge>
                    </div>

                    {/* Feedback Comments Box */}
                    <p className="text-sm text-foreground/80 font-serif leading-relaxed italic bg-muted/20 p-3 rounded-lg border border-border/20">
                      "{f.comments}"
                    </p>
                  </div>

                  {/* Footer metadata details */}
                  <div className="pt-3 border-t border-border/40 flex justify-between items-center text-xs flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-foreground">{f.clientName}</p>
                      <p className="text-[10px] text-muted-foreground">{f.clientCompany || "Client"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">{f.projectName}</p>
                      <p className="text-[9px] text-muted-foreground/60 flex items-center justify-end gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </motion.div>
  );
}
