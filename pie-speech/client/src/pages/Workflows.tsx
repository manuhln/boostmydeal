import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Workflow, 
  Search, 
  Plus, 
  Calendar, 
  Edit, 
  MoreVertical, 
  Trash2
} from "lucide-react";
import { Link } from "wouter";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { useWorkflows, useDeleteWorkflow, useToggleWorkflow } from "@/hooks/useWorkflows";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Workflows() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();
  
  const { data: workflows, isLoading, error } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleWorkflow = useToggleWorkflow();

  const handleDeleteWorkflow = (workflowId: string, workflowName: string) => {
    setWorkflowToDelete({ id: workflowId, name: workflowName });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (workflowToDelete) {
      try {
        await deleteWorkflow.mutateAsync(workflowToDelete.id);
        setDeleteModalOpen(false);
        setWorkflowToDelete(null);
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setWorkflowToDelete(null);
  };

  const handleToggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      await toggleWorkflow.mutateAsync({ workflowId, isActive: !isActive });
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const filteredWorkflows = workflows?.data?.filter((workflow: any) =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Layout>
      {/* Header */}
      <header className="bg-background border-b border-[#3B82F6]/30 px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Workflows</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Automate your call processes with custom workflows
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/workflows/create">
              <Button className="bg-[#3B82F6] hover:bg-[#E63600] text-white w-full sm:w-auto" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 bg-background">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Workflows"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border text-foreground placeholder-gray-400"
            />
          </div>
        </div>

        {/* Workflows Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">All Workflows</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Last Updated</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow className="border-gray-800">
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        Loading workflows...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow className="border-gray-800">
                      <TableCell colSpan={4} className="text-center py-12 text-red-400">
                        Error loading workflows: {error.message}
                      </TableCell>
                    </TableRow>
                  ) : filteredWorkflows.length === 0 ? (
                    <TableRow className="border-gray-800">
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center space-y-4">
                          <Workflow className="h-16 w-16 text-gray-600" />
                          <div>
                          <p className="text-lg font-medium text-foreground mb-2">No workflows created</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Get started by creating your first automated workflow
                          </p>
                          <Link href="/workflows/create">
                            <Button className="bg-[#3B82F6] hover:bg-[#E63600] text-white">
                              <Plus className="mr-2 h-4 w-4" />
                              Create Your First Workflow
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  ) : (
                    filteredWorkflows.map((workflow: any) => (
                      <TableRow key={workflow._id} className="border-gray-800">
                        <TableCell className="text-foreground">{workflow.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={workflow.isActive}
                              onCheckedChange={() => handleToggleWorkflow(workflow._id, workflow.isActive)}
                              className="data-[state=checked]:bg-[#3B82F6]"
                            />
                            <span className={`text-sm ${workflow.isActive ? 'text-green-400' : 'text-muted-foreground'}`}>
                              {workflow.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-gray-600">
                              <Link href={`/workflows/edit/${workflow._id}`}>
                                <DropdownMenuItem className="text-foreground hover:bg-accent">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/workflows/execution-history/${workflow._id}`}>
                                <DropdownMenuItem className="text-foreground hover:bg-accent">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  View Execution History
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteWorkflow(workflow._id, workflow.name)}
                                className="text-red-400 hover:bg-accent"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Workflow"
          description="Are you sure you want to delete this workflow? This will stop all automation and remove the workflow permanently."
          itemName={workflowToDelete?.name}
          isLoading={deleteWorkflow.isPending}
        />
      </div>
    </Layout>
  );
}