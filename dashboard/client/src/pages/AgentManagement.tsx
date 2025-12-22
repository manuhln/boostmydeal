import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import AssistantsList from "@/components/assistant/AssistantsList";
import CreateAssistant from "@/components/assistant/CreateAssistant";

export default function AgentManagement() {
  const [selectedAssistant, setSelectedAssistant] = useState(null);

  // Fetch agents
  const { data: agents, isLoading } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Fetch providers for the form
  const { data: providersData } = useQuery({
    queryKey: ["/api/providers"],
  });

  const providers = providersData?.data || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">Loading agents...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-full bg-background">
        {/* Left side - Assistants List */}
        <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-[#F74000]/30">
          <AssistantsList
            agents={agents?.data || []}
            selectedAssistant={selectedAssistant}
            onSelectAssistant={setSelectedAssistant}
          />
        </div>

        {/* Right side - Create Assistant */}
        <div className="w-full lg:w-2/3">
          <CreateAssistant
            providers={providers}
            selectedAssistant={selectedAssistant}
            onAssistantChange={setSelectedAssistant}
          />
        </div>
      </div>
    </Layout>
  );
}