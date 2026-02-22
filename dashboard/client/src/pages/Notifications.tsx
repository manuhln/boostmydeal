import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, Check, CheckCheck, Phone, PhoneOff, AlertCircle } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useNotifications";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  call_success: "Call completed",
  call_failed: "Call failed",
  call_no_answer: "No answer",
  call_timeout: "Call timeout",
  call_busy: "Line busy",
  system_error: "System error",
};

export default function Notifications() {
  const [readFilter, setReadFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const readFilterValue = readFilter === "all" ? undefined : readFilter === "read";
  const { data, isLoading } = useNotifications({
    read: readFilterValue,
    page,
    limit: 20,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "call_success":
        return <Phone className="h-4 w-4 text-green-500" />;
      case "call_no_answer":
      case "call_timeout":
      case "call_busy":
        return <PhoneOff className="h-4 w-4 text-orange-500" />;
      case "call_failed":
      case "system_error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Layout>
      <div>
        <header className="bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-muted-foreground mt-1">
                Call events, failures, and system alerts
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending || total === 0}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 bg-background">
          <Card className="bg-card border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : !notifications.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-foreground">Type</TableHead>
                      <TableHead className="text-foreground">Title</TableHead>
                      <TableHead className="text-foreground">Message</TableHead>
                      <TableHead className="text-foreground">Time</TableHead>
                      <TableHead className="text-foreground w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((n) => (
                      <TableRow
                        key={n._id}
                        className={`border-gray-800 ${!n.read ? "bg-accent/20" : ""}`}
                      >
                        <TableCell className="text-foreground">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(n.type)}
                            <span className="text-sm">
                              {NOTIFICATION_TYPE_LABELS[n.type] || n.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">{n.title}</TableCell>
                        <TableCell className="text-foreground text-sm max-w-md truncate">
                          {n.message}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(n.createdAt)}
                        </TableCell>
                        <TableCell>
                          {!n.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markRead.mutate(n._id)}
                              disabled={markRead.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
