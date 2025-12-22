import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar, Star, RotateCcw, Plus, Users, ArrowUp, ArrowDown, Tag, User, Settings } from "lucide-react";
import { useCallMetrics } from "@/hooks/useCallMetrics";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface TagAnalytics {
  tagName: string;
  count: number;
  type: 'user' | 'system';
}

interface ChartDataPoint {
  date: string;
  totalCalls: number;
}

interface DashboardMetrics {
  totalCalls: number;
  averageCallDuration: number;
  tagAnalytics: TagAnalytics[];
  chartData: ChartDataPoint[];
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [appliedDate, setAppliedDate] = useState<string>('');

  // Use new dashboard metrics endpoint with tag analytics and chart data
  const queryKey = appliedDate 
    ? [`/api/metrics/dashboard?date=${appliedDate}`]
    : ["/api/metrics/dashboard"];

  const { data: dashboardMetricsResponse, isLoading: metricsLoading } = useQuery({
    queryKey: queryKey
  });

  const handleFilter = () => {
    setAppliedDate(selectedDate);
  };

  const handleClear = () => {
    setSelectedDate('');
    setAppliedDate('');
  };
  
  const metrics = (dashboardMetricsResponse as any)?.data || {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'in_progress':
        return 'status-in-progress';
      case 'missed':
        return 'status-missed';
      default:
        return 'status-failed';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatChangeValue = (change?: string | number) => {
    if (!change) return '+0%';
    const value = typeof change === 'string' ? parseFloat(change) : change;
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatAverageDuration = (seconds?: number) => {
    if (!seconds) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const coreMetricCards = [
    {
      title: "Total Calls",
      value: metrics?.totalCalls || 0,
      icon: Phone,
      iconBg: "bg-[#F74000]/10",
      iconColor: "text-[#F74000]",
    },
    {
      title: "Average Call Duration",
      value: formatAverageDuration(metrics?.averageCallDuration),
      icon: Calendar,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
  ];

  // Create tag analysis cards from analytics data
  const tagAnalyticsCards = (metrics?.tagAnalytics || []).map((tag: TagAnalytics) => ({
    title: tag.tagName.charAt(0).toUpperCase() + tag.tagName.slice(1),
    value: tag.count,
    icon: tag.type === 'user' ? User : Settings,
    iconBg: tag.type === 'user' ? "bg-purple-500/10" : "bg-orange-500/10",
    iconColor: tag.type === 'user' ? "text-purple-500" : "text-orange-500",
    subtitle: `${tag.type === 'user' ? 'User' : 'System'} Tag`
  }));

  const allMetricCards = [...coreMetricCards, ...tagAnalyticsCards];

  return (
    <Layout>
      {/* Header */}
      <header className="bg-background border-b border-[#F74000]/30 px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back! Here's a snapshot of your account activity.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/call-logs">
                <Button 
                  className="bg-[#F74000] hover:bg-[#F74000]/90 text-white border-0 w-full sm:w-auto"
                  size="sm"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Start Call
                </Button>
              </Link>
              <Link href="/agents">
                <Button 
                  variant="outline" 
                  className="border-[#F74000] text-[#F74000] hover:bg-[#F74000]/10 w-full sm:w-auto"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assistant
                </Button>
              </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 bg-background min-h-screen">
        {/* Date Filter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h3 className="text-lg font-semibold text-foreground">Analytics Overview</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              placeholder="Filter by date"
            />
            <Button
              onClick={handleFilter}
              disabled={!selectedDate}
              className="bg-[#F74000] hover:bg-[#F74000]/90 text-white"
            >
              Filter
            </Button>
            {appliedDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {allMetricCards.map((card: any, index: number) => {
            const Icon = card.icon;
            
            return (
              <Card key={`${card.title}-${card.subtitle || 'core'}-${index}`} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground/80">
                          {card.subtitle}
                        </p>
                      )}
                      <p className="text-2xl font-bold text-foreground mt-2">
                        {metricsLoading ? '-' : (
                          card.title === "Average Call Duration" ? card.value : 
                          (typeof card.value === 'number' ? card.value.toLocaleString() : card.value)
                        )}
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Last 7 Days Call Chart */}
        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Last 7 Days - Total Calls</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {metricsLoading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff"
                      fontSize={12}
                      tick={{ fill: '#ffffff' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        });
                      }}
                    />
                    <YAxis 
                      stroke="#ffffff"
                      fontSize={12}
                      tick={{ fill: '#ffffff' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444444',
                        borderRadius: '6px',
                        color: '#ffffff'
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        });
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalCalls" 
                      stroke="#F74000" 
                      strokeWidth={3}
                      dot={{ fill: '#F74000', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#F74000', strokeWidth: 2 }}
                      name="Total Calls"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
