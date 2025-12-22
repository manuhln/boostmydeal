import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export default function WorkflowExecutionHistory() {
  const { workflowId } = useParams();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch workflow details
  const { data: workflowData } = useQuery<any>({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!workflowId
  });

  const workflow = workflowData?.data;

  // Fetch execution history
  const { data: executionData, isLoading } = useQuery<any>({
    queryKey: [`/api/workflows/${workflowId}/executions`],
    enabled: !!workflowId
  });

  const executions = executionData?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'RUNNING':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            {status}
          </Badge>
        );
    }
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    if (!completedAt) return "In progress";
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const duration = end.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 bg-black min-h-screen">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workflows">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workflows
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Execution History: {workflow?.name || 'Loading...'}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                View all executions and their details for this workflow
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#141414] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Executions</p>
                  <p className="text-xl font-bold text-white">{executions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141414] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Successful</p>
                  <p className="text-xl font-bold text-white">
                    {executions.filter((e: any) => e.status === 'COMPLETED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141414] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Failed</p>
                  <p className="text-xl font-bold text-white">
                    {executions.filter((e: any) => e.status === 'FAILED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141414] border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Running</p>
                  <p className="text-xl font-bold text-white">
                    {executions.filter((e: any) => e.status === 'RUNNING').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Execution Table */}
        <Card className="bg-[#141414] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Execution Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Execution ID</TableHead>
                    <TableHead className="text-gray-400">Call Details</TableHead>
                    <TableHead className="text-gray-400">Trigger</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Duration</TableHead>
                    <TableHead className="text-gray-400">Started At</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        Loading execution history...
                      </TableCell>
                    </TableRow>
                  ) : executions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        No executions found for this workflow
                      </TableCell>
                    </TableRow>
                  ) : (
                    executions.map((execution: any) => (
                      <>
                        <TableRow key={execution._id} className="border-gray-700">
                          <TableCell className="text-white font-mono text-sm">
                            {execution._id.slice(-8)}...
                          </TableCell>
                          <TableCell>
                            <div className="text-white">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{execution.callSession?.assistant?.name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                <Phone className="h-3 w-3" />
                                <span>{execution.callSession?.contactPhone || 'No phone'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-400">
                            {execution.triggerType}
                          </TableCell>
                          <TableCell>{getStatusBadge(execution.status)}</TableCell>
                          <TableCell className="text-gray-400">
                            {formatDuration(execution.startedAt, execution.completedAt)}
                          </TableCell>
                          <TableCell className="text-gray-400">
                            {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow(expandedRow === execution._id ? null : execution._id)}
                              className="text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white"
                            >
                              {expandedRow === execution._id ? 'Hide' : 'View'} Details
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === execution._id && (
                          <TableRow className="border-gray-700 bg-black/50">
                            <TableCell colSpan={7}>
                              <div className="p-4 space-y-4">
                                {/* Error Message */}
                                {execution.errorMessage && (
                                  <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                                    <p className="text-red-400 text-sm">
                                      <strong>Error:</strong> {execution.errorMessage}
                                    </p>
                                  </div>
                                )}

                                {/* Node Outputs */}
                                <div>
                                  <h4 className="text-white font-medium mb-2">Node Outputs</h4>
                                  <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                                    <pre className="text-gray-300 whitespace-pre-wrap">
                                      {JSON.stringify(execution.nodeOutputs, null, 2)}
                                    </pre>
                                  </div>
                                </div>

                                {/* Call Session Payloads */}
                                {execution.callSession?.payloads && (
                                  <div>
                                    <h4 className="text-white font-medium mb-2">Call Session Payloads</h4>
                                    <div className="space-y-2">
                                      {execution.callSession.payloads.map((payload: any, index: number) => (
                                        <div key={index} className="bg-gray-900 rounded p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-[#3B82F6] border-[#3B82F6]/30">
                                              {payload.type}
                                            </Badge>
                                            <span className="text-xs text-gray-400">
                                              {new Date(payload.timestamp).toLocaleString()}
                                            </span>
                                          </div>
                                          <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                                            {JSON.stringify(payload.data, null, 2)}
                                          </pre>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}