import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, MoreVertical, Trash2 } from "lucide-react";
// Using any for now since MongoDB model differs from Drizzle schema
interface AssistantsListProps {
  agents: any[];
  selectedAssistant: any;
  onSelectAssistant: (agent: any) => void;
}

export default function AssistantsList({ 
  agents, 
  selectedAssistant, 
  onSelectAssistant 
}: AssistantsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete agent mutation
  const deleteMutation = useMutation({
    mutationFn: async (agentId: string) => {
      await apiRequest("DELETE", `/api/agents/${agentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Assistant deleted",
        description: "The assistant has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assistant.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAgent = (e: React.MouseEvent, agentId: string, agentName: string) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    setAgentToDelete({ id: agentId, name: agentName });
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (agentToDelete) {
      deleteMutation.mutate(agentToDelete.id);
      setDeleteModalOpen(false);
      setAgentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setAgentToDelete(null);
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get language display from language code
  const getLanguageDisplay = (agent: any) => {
    // Try to get language from the languages array (new format)
    if (agent.languages && agent.languages.length > 0) {
      return agent.languages[0]; // Return the first language code
    }
    // Fallback to voiceSettings.language (old format)
    if (agent.voiceSettings?.language) {
      return agent.voiceSettings.language;
    }
    // Default to English
    return "en";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-border">
        <div className="mb-4">
          <h2 className="text-xl lg:text-2xl font-bold">Assistants</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3B82F6] w-4 h-4" />
          <Input
            placeholder="Search Assistants"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#3B82F6] focus:ring-[#3B82F6] focus:border-[#3B82F6]"
          />
        </div>
      </div>

      {/* Assistants List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="text-center text-muted-foreground mb-6">
              {searchTerm ? "No assistants found matching your search." : "No assistants created yet."}
            </div>
            <Button 
              onClick={() => onSelectAssistant(null)}
              className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Assistant
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {filteredAgents.map((agent, index) => {
              // Handle MongoDB ObjectId properly - convert buffer to hex string for browser
              const agentId = typeof agent._id === 'object' && agent._id?.buffer 
                ? Object.values(agent._id.buffer).map((byte: any) => byte.toString(16).padStart(2, '0')).join('')
                : agent._id?.toString() || `agent-${index}`;
              const selectedId = typeof selectedAssistant?._id === 'object' && selectedAssistant._id?.buffer
                ? Object.values(selectedAssistant._id.buffer).map((byte: any) => byte.toString(16).padStart(2, '0')).join('')
                : selectedAssistant?._id?.toString();
                
              return (
                <div
                  key={agentId}
                  onClick={() => onSelectAssistant(agent)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors mb-2 border-2 ${
                    selectedId === agentId
                      ? "bg-[#3B82F6]/10 border-[#3B82F6]"
                      : "border-[#3B82F6]/30 hover:border-[#3B82F6]/60 hover:bg-muted/50"
                  }`}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10 mt-1">
                    <AvatarImage 
                      src={agent.profileImageUrl || ''} 
                      alt={agent.name} 
                    />
                    <AvatarFallback className="bg-[#3B82F6]/10 text-[#3B82F6]">
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground truncate">
                        {agent.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          agent.isActive 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                          {agent.isActive ? "Active" : "Inactive"}
                        </span>
                        
                        {/* Three-dot dropdown menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteAgent(e, agentId, agent.name)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {agent.description || "No description provided"}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{agent.voiceProvider || "No provider"}</span>
                      <span>{getLanguageDisplay(agent)}</span>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
            
            {/* Add Assistant Button - Positioned after the list */}
            <div className="p-4 text-center">
              <Button 
                onClick={() => onSelectAssistant(null)}
                className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Assistant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Assistant"
        description="Are you sure you want to delete this assistant? All associated data will be permanently removed."
        itemName={agentToDelete?.name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}