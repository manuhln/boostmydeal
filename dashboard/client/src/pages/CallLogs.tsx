import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Download,
  Filter,
  Phone,
  Plus,
  Play,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useCalls,
  useExportCalls,
  useInitiateCall,
  useInitiateCallDemo,
} from "@/hooks/useCalls";
import { useAgents } from "@/hooks/useAgents";
import { useToast } from "@/hooks/use-toast";

import type { CallLogFilters } from "@/lib/types";
import { CALL_TYPES, CALL_STATUSES } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { TranscriptOverlay } from "@/components/TranscriptOverlay";

export default function CallLogs() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<CallLogFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<CallLogFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [outboundCallData, setOutboundCallData] = useState({
    assistantId: "",
    toNumber: "",
    contactName: "",
  });
  const [transcriptOverlay, setTranscriptOverlay] = useState({
    isOpen: false,
    callId: "",
    contactName: "",
    status: "",
  });
  const [expandedTagRows, setExpandedTagRows] = useState<Set<string>>(
    new Set(),
  );

  const { data: callsResponse, isLoading: callsLoading } = useCalls({
    ...appliedFilters,
    page: currentPage,
    limit: 20,
  });
  const { data: agentsResponse } = useAgents();

  // Fetch assistants for outbound call modal
  const { data: assistantsResponse } = useQuery({
    queryKey: ["/api/agents"],
  }) as { data?: { data?: any[] } };

  const calls = callsResponse?.data || [];
  const totalCalls = callsResponse?.total || 0;
  const totalPages = Math.ceil(totalCalls / 20);
  const agents = agentsResponse?.data || [];
  const assistants = assistantsResponse?.data || [];
  const exportCalls = useExportCalls();
  const initiateCall = useInitiateCall();
  const initiateCallDemo = useInitiateCallDemo(); // Temporary demo method

  const handleFilterChange = (key: keyof CallLogFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === "all" ? undefined : value,
    }));
  };

  const applyFilters = () => {
    // Clean filters by removing undefined values
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(
        ([_, value]) => value !== undefined && value !== "",
      ),
    );
    console.log("🔍 [Frontend] Applying filters:", cleanedFilters);
    setAppliedFilters(cleanedFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setAppliedFilters({});
  };

  const handleExport = async () => {
    try {
      await exportCalls.mutateAsync(appliedFilters);
      toast({
        title: "Success",
        description: "Call logs exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export call logs",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "status-completed";
      case "in_progress":
        return "status-in-progress";
      case "missed":
        return "status-missed";
      case "initiated":
        return "status-initiated";
      case "cancelled":
        return "status-cancelled";
      case "failed":
        return "status-failed";
      default:
        return "status-failed";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCost = (cost?: number | string) => {
    if (!cost || cost === 0) return "-";
    const numericCost = typeof cost === "string" ? parseFloat(cost) : cost;
    if (isNaN(numericCost)) return "-";
    return `$${numericCost.toFixed(4)}`;
  };

  const formatDate = (dateInput?: string | Date | null) => {
    if (!dateInput) return "-";

    try {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (isNaN(date.getTime())) return "-";

      // Format as MM/DD/YYYY HH:MM AM/PM
      return date.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "-";
    }
  };

  const formatAverageDuration = (seconds?: number) => {
    if (!seconds) return "0m 0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return "-";
    // Format phone number as (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleOutboundCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!outboundCallData.assistantId) {
      toast({
        title: "Error",
        description: "Please select an assistant",
        variant: "destructive",
      });
      return;
    }

    if (!outboundCallData.toNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!outboundCallData.contactName) {
      toast({
        title: "Error",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🚀 Initiating call with data:", outboundCallData);

      // DEMO VERSION: Temporary shortcut bypassing Redis/webhook
      // const result = await initiateCallDemo.mutateAsync({
      //   assistantId: outboundCallData.assistantId,
      //   toNumber: outboundCallData.toNumber,
      //   contactName: outboundCallData.contactName,
      // });
      const result = await initiateCall.mutateAsync({
        assistantId: outboundCallData.assistantId,
        toNumber: outboundCallData.toNumber,
        message: `Call to ${outboundCallData.contactName}`,
      });
      console.log("✅ Call initiation result:", result);
      toast({
        title: "Call Initiated",
        description: result?.message || "Outbound call queued successfully",
      });

      // Reset form and close modal
      setOutboundCallData({
        assistantId: "",
        toNumber: "",
        contactName: "",
      });
      setIsOutboundModalOpen(false);
    } catch (error: any) {
      console.error("❌ Call initiation error:", error);

      // Handle low credits error (402 Payment Required)
      if (
        error?.status === 402 ||
        error?.message?.toLowerCase()?.includes("low credits")
      ) {
        toast({
          title: "Low Credits",
          description:
            "Please add more credits to make call.",
          variant: "destructive",
        });
      // Handle duplicate call error specifically
      } else if (
        error?.status === 409 ||
        error?.message?.includes("already in progress")
      ) {
        toast({
          title: "Duplicate Call Detected",
          description:
            "A call to this number is already in progress. Please wait for it to complete before initiating another call.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Call Failed",
          description:
            error?.message ||
            "Failed to initiate call. Please check your configuration.",
          variant: "destructive",
        });
      }
    }
  };

  const handleOutboundFormChange = (field: string, value: string) => {
    setOutboundCallData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenTranscript = (
    callId: string,
    contactName: string,
    status: string,
  ) => {
    setTranscriptOverlay({
      isOpen: true,
      callId,
      contactName,
      status,
    });
  };

  const handleCloseTranscript = () => {
    setTranscriptOverlay({
      isOpen: false,
      callId: "",
      contactName: "",
      status: "",
    });
  };

  const toggleTagExpansion = (callId: string) => {
    setExpandedTagRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(callId)) {
        newSet.delete(callId);
      } else {
        newSet.add(callId);
      }
      return newSet;
    });
  };

  return (
    <Layout transcriptOverlayOpen={transcriptOverlay.isOpen}>
      {/* Main content - layout handles the shifting */}
      <div>
        {/* Header */}
        <header className="bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-foreground">
                Call Logs
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Dialog
                open={isOutboundModalOpen}
                onOpenChange={setIsOutboundModalOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-[#F74000] hover:bg-[#E63600] text-white w-full sm:w-auto py-4 px-6"
                    size="default"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Outbound Call
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto bg-card border-gray-800 max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center text-foreground text-lg">
                      <Phone className="mr-2 h-5 w-5 flex-shrink-0" />
                      Create Outbound Call
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={handleOutboundCallSubmit}
                    className="space-y-4 mt-4"
                  >
                    <div>
                      <Label htmlFor="assistant" className="text-gray-300">
                        Select Assistant
                      </Label>
                      <Select
                        value={outboundCallData.assistantId}
                        onValueChange={(value) =>
                          handleOutboundFormChange("assistantId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an assistant" />
                        </SelectTrigger>
                        <SelectContent>
                          {assistants?.map((assistant: any, index: number) => {
                            // Convert MongoDB ObjectId buffer to hex string safely
                            const bufferArray = assistant._id?.buffer
                              ? Object.values(assistant._id.buffer)
                              : [];
                            const assistantId =
                              bufferArray.length > 0
                                ? (bufferArray as number[])
                                    .map((byte) =>
                                      byte.toString(16).padStart(2, "0"),
                                    )
                                    .join("")
                                : assistant._id?.toString() ||
                                  `assistant-${index}`;

                            return (
                              <SelectItem
                                key={`select-${assistantId}-${index}`}
                                value={assistantId}
                              >
                                {assistant.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="toNumber" className="text-gray-300">
                        To Number
                      </Label>
                      <Input
                        id="toNumber"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={outboundCallData.toNumber}
                        onChange={(e) =>
                          handleOutboundFormChange("toNumber", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactName" className="text-gray-300">
                        Contact Name
                      </Label>
                      <Input
                        id="contactName"
                        type="text"
                        placeholder="Enter contact name"
                        value={outboundCallData.contactName}
                        onChange={(e) =>
                          handleOutboundFormChange(
                            "contactName",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOutboundModalOpen(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={initiateCall.isPending}
                        className="bg-[#F74000] hover:bg-[#E63600] text-white w-full sm:w-auto disabled:opacity-50"
                      >
                        {initiateCall.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Initiating...
                          </>
                        ) : (
                          <>
                            <Phone className="mr-2 h-4 w-4" />
                            Initiate Call
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleExport}
                disabled={exportCalls.isPending}
                className="bg-[#F74000] hover:bg-[#E63600] text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-background">
          {/* Filters */}
          <Card className="mb-6 bg-card border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Filter className="mr-2 h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="dateFrom" className="text-gray-300">
                    Date From
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={
                      filters.dateFrom
                        ? new Date(filters.dateFrom).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      // Convert to ISO string if value exists
                      const value = e.target.value;
                      const isoValue = value
                        ? new Date(value + "T00:00:00.000Z").toISOString()
                        : "";
                      handleFilterChange("dateFrom", isoValue);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="dateTo" className="text-gray-300">
                    Date To
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={
                      filters.dateTo
                        ? new Date(filters.dateTo).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      // Convert to ISO string if value exists
                      const value = e.target.value;
                      const isoValue = value
                        ? new Date(value + "T23:59:59.999Z").toISOString()
                        : "";
                      handleFilterChange("dateTo", isoValue);
                    }}
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Call Type</Label>
                  <Select
                    value={filters.callType || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("callType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Call Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {CALL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Agent</Label>
                  <Select
                    value={filters.agentId || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("agentId", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents?.map((agent, index) => {
                        // Convert MongoDB ObjectId buffer to hex string safely
                        const bufferArray = (agent as any)._id?.buffer
                          ? Object.values((agent as any)._id.buffer)
                          : [];
                        const agentId =
                          bufferArray.length > 0
                            ? (bufferArray as number[])
                                .map((byte) =>
                                  byte.toString(16).padStart(2, "0"),
                                )
                                .join("")
                            : (agent as any)._id?.toString() ||
                              (agent as any).id?.toString() ||
                              `agent-${index}`;

                        return (
                          <SelectItem
                            key={`agent-${agentId}-${index}`}
                            value={agentId}
                          >
                            {(agent as any).name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {CALL_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contactName" className="text-gray-300">
                    Contact Name
                  </Label>
                  <Input
                    id="contactName"
                    type="text"
                    placeholder="Search contact name"
                    value={filters.contactName || ""}
                    onChange={(e) =>
                      handleFilterChange("contactName", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Button
                  onClick={applyFilters}
                  className="bg-[#F74000] hover:bg-[#E63600] text-white"
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-gray-600 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Call Logs Table */}
          <Card className="bg-card border-gray-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 bg-[#F74000]">
                      <TableHead className="text-white font-semibold rounded-tl-lg">
                        Name
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Contact Number
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Assistant
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Duration
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Cost
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Call ID
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Tags
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Recording
                      </TableHead>
                      <TableHead className="text-white font-semibold rounded-tr-lg">
                        Transcript
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callsLoading ? (
                      <TableRow className="border-gray-800">
                        <TableCell
                          colSpan={11}
                          className="text-center py-8 text-foreground"
                        >
                          Loading calls...
                        </TableCell>
                      </TableRow>
                    ) : !calls?.length ? (
                      <TableRow className="border-gray-800">
                        <TableCell
                          colSpan={11}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Phone className="h-12 w-12 text-gray-600" />
                            <p className="text-lg font-medium text-foreground">
                              No calls found
                            </p>
                            <p className="text-sm">
                              Create your first outbound call or adjust your
                              filters
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      calls.map((call, index) => {
                        // Convert MongoDB ObjectId buffer to hex string safely
                        const bufferArray = (call as any)._id?.buffer
                          ? Object.values((call as any)._id.buffer)
                          : [];
                        const callId =
                          bufferArray.length > 0
                            ? (bufferArray as number[])
                                .map((byte) =>
                                  byte.toString(16).padStart(2, "0"),
                                )
                                .join("")
                            : (call as any)._id?.toString() ||
                              (call as any).id?.toString() ||
                              `call-${index}`;

                        return (
                          <TableRow
                            key={`call-row-${callId}-${index}`}
                            className="border-gray-800 hover:bg-accent/50"
                          >
                            {/* Name */}
                            <TableCell className="text-foreground">
                              {call.contactName || "-"}
                            </TableCell>

                            {/* Contact Number */}
                            <TableCell className="text-foreground font-mono">
                              {formatPhoneNumber(
                                call.contactPhone || undefined,
                              )}
                            </TableCell>

                            {/* Assistant */}
                            <TableCell className="text-foreground">
                              {(call as any).assistantId?.name || "-"}
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-foreground">
                              {formatDate(call.startedAt)}
                            </TableCell>

                            {/* Duration */}
                            <TableCell className="text-foreground">
                              {formatDuration(call.duration || 0)}
                            </TableCell>

                            {/* Cost */}
                            <TableCell className="text-foreground">
                              {formatCost(call.cost || undefined)}
                            </TableCell>

                            {/* Call ID (twilioSid) */}
                            <TableCell className="text-foreground font-mono text-sm">
                              {(call as any).twilioSid || "-"}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="min-w-[120px]">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
                                  call.status === "completed"
                                    ? "border-[#F74000] text-[#F74000]"
                                    : call.status === "in_progress" ||
                                        call.status === "in-progress"
                                      ? "border-[#F74000] text-[#F74000]"
                                      : call.status === "failed"
                                        ? "border-red-500 text-red-500"
                                        : call.status === "voicemail"
                                          ? "border-orange-500 text-orange-500"
                                          : call.status === "missed"
                                            ? "border-red-500 text-red-500"
                                            : call.status === "queued"
                                              ? "border-[#F74000] text-[#F74000]"
                                              : call.status === "ringing"
                                                ? "border-[#F74000] text-[#F74000]"
                                                : "border-gray-500 text-gray-500"
                                }`}
                              >
                                {call.status === "completed"
                                  ? "Completed"
                                  : call.status === "missed"
                                    ? "Missed"
                                    : call.status === "failed"
                                      ? "Failed"
                                      : call.status === "voicemail"
                                        ? "Voicemail"
                                        : call.status === "in_progress" ||
                                            call.status === "in-progress"
                                          ? "In Progress"
                                          : call.status === "queued"
                                            ? "Queued"
                                            : call.status === "ringing"
                                              ? "Ringing"
                                              : call.status.replace("_", " ")}
                              </span>
                            </TableCell>

                            {/* Tags */}
                            <TableCell className="text-foreground">
                              <div className="h-8 flex items-center">
                                {(call as any).user_tags?.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    {/* Show first tag or all tags if expanded */}
                                    {(expandedTagRows.has(callId)
                                      ? (call as any).user_tags
                                      : (call as any).user_tags.slice(0, 1)
                                    ).map((tag: string, tagIndex: number) => (
                                      <span
                                        key={`tag-${tagIndex}`}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#F74000]/20 text-[#F74000] border border-[#F74000]/30"
                                      >
                                        {tag}
                                      </span>
                                    ))}

                                    {/* Show "+X more" button if there are more than 1 tag and not expanded */}
                                    {(call as any).user_tags.length > 1 &&
                                      !expandedTagRows.has(callId) && (
                                        <button
                                          onClick={() =>
                                            toggleTagExpansion(callId)
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30 transition-colors"
                                          data-testid={`button-expand-tags-${callId}`}
                                        >
                                          +{(call as any).user_tags.length - 1}{" "}
                                          more
                                        </button>
                                      )}

                                    {/* Show collapse button if expanded */}
                                    {expandedTagRows.has(callId) &&
                                      (call as any).user_tags.length > 1 && (
                                        <button
                                          onClick={() =>
                                            toggleTagExpansion(callId)
                                          }
                                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30 transition-colors ml-1"
                                          data-testid={`button-collapse-tags-${callId}`}
                                        >
                                          Show less
                                        </button>
                                      )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Recording */}
                            <TableCell className="text-foreground">
                              {(call as any).recording ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      (call as any).recording,
                                      "_blank",
                                    )
                                  }
                                  className="border-[#F74000] text-[#F74000] hover:bg-[#F74000] hover:text-white"
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Play
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  -
                                </span>
                              )}
                            </TableCell>

                            {/* Transcript */}
                            <TableCell className="text-foreground">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenTranscript(
                                    (call as any)._id ||
                                      (call as any).twilioSid,
                                    call.contactName || "Unknown Contact",
                                    call.status,
                                  )
                                }
                                className="border-[#F74000] text-[#F74000] hover:bg-[#F74000] hover:text-white"
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Transcript
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 bg-card border border-gray-800 rounded-lg mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * 20 + 1} to{" "}
                {Math.min(currentPage * 20, totalCalls)} of {totalCalls} calls
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="border-[#F74000] text-[#F74000] hover:bg-[#F74000] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={
                          currentPage === pageNum
                            ? "bg-[#F74000] text-white hover:bg-[#E63600]"
                            : "border-[#F74000] text-[#F74000] hover:bg-[#F74000] hover:text-white"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="border-[#F74000] text-[#F74000] hover:bg-[#F74000] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Overlay */}
      <TranscriptOverlay
        callId={transcriptOverlay.callId}
        isOpen={transcriptOverlay.isOpen}
        onClose={handleCloseTranscript}
        contactName={transcriptOverlay.contactName}
        status={transcriptOverlay.status}
      />
    </Layout>
  );
}
