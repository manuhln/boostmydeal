import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Mail, 
  Brain, 
  Plus,
  Save,
  X,
  Trash2,
  Settings,
  ArrowLeft,
  Building2,
  Database,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAgents } from '@/hooks/useAgents';

// Node types matching the backend
type NodeType = 'TRIGGER' | 'AI_AGENT' | 'EMAIL_TOOL' | 'HUBSPOT_TOOL' | 'ZOHO_TOOL';

interface NodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  config?: any;
}

interface WorkflowNode extends Node<NodeData> {
  data: NodeData;
}

// Field type definition
interface FieldConfig {
  name: string;
  label: string;
  type: 'select' | 'text' | 'textarea';
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string; }[];
  condition?: (data: any) => boolean;
}

interface NodeConfig {
  label: string;
  icon: any;
  color: string;
  description: string;
  fields: FieldConfig[];
}

// Node configurations for the sidebar
const NODE_CONFIGS: Record<NodeType, NodeConfig> = {
  TRIGGER: {
    label: 'Trigger',
    icon: Play,
    color: 'bg-green-600',
    description: 'Start workflow on event',
    fields: [
      {
        name: 'triggerType',
        label: 'Trigger Type',
        type: 'select',
        options: [
          { value: 'PHONE_CALL_CONNECTED', label: 'Phone Call Connected' },
          { value: 'PHONE_CALL_ENDED', label: 'Phone Call Ended' },
          { value: 'webhook', label: 'Webhook' },
          { value: 'schedule', label: 'Schedule' },
          { value: 'manual', label: 'Manual' },
        ],
      },
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        condition: (data: any) => data.triggerType === 'webhook',
      },
    ],
  },
  EMAIL_TOOL: {
    label: 'Send Email',
    icon: Mail,
    color: 'bg-blue-600',
    description: 'Send notification email',
    fields: [
      {
        name: 'recipient',
        label: 'Recipient',
        type: 'text',
        placeholder: 'email@example.com or {{aiAnalysis.email}}',
        hint: 'Use {{aiAnalysis.email}} to use email from AI agent',
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        placeholder: 'Email subject',
        hint: 'You can use {{aiAnalysis.field_name}} for AI data',
      },
      {
        name: 'body',
        label: 'Body',
        type: 'textarea',
        placeholder: 'Email content...\n\nUse placeholders like:\n{{aiAnalysis.customer_name}}\n{{trigger.full_transcript}}',
        hint: 'AI agent output available as {{aiAnalysis.field_name}}',
      },
    ],
  },
  AI_AGENT: {
    label: 'AI Agent',
    icon: Brain,
    color: 'bg-purple-600',
    description: 'Process with AI',
    fields: [
      {
        name: 'inputField',
        label: 'Input Field',
        type: 'select',
        options: [
          { value: 'transcript', label: 'Transcript' },
        ],
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Enter the prompt for the AI agent...\nExample: Analyze the transcript to determine if the customer is interested in our service and extract their contact information and deal details for CRM integration.',
      },
      {
        name: 'tool',
        label: 'Tool',
        type: 'select',
        options: [
          { value: 'email', label: 'Email' },
          { value: 'hubspot', label: 'HubSpot' },
          { value: 'zoho', label: 'Zoho' },
        ],
      },
    ],
  },
  HUBSPOT_TOOL: {
    label: 'HubSpot',
    icon: Building2,
    color: 'bg-orange-600',
    description: 'Manage HubSpot CRM',
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'GET_DEAL', label: 'Get Deal' },
          { value: 'CREATE_DEAL', label: 'Create Deal' },
          { value: 'UPDATE_DEAL', label: 'Update Deal' },
        ],
      },
      {
        name: 'dealId',
        label: 'Deal ID',
        type: 'text',
        placeholder: 'Enter deal ID or {{aiAnalysis.deal_id}}',
        hint: 'Required for Get Deal and Update Deal actions',
        condition: (data: any) => data.action === 'GET_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'dealName',
        label: 'Deal Name',
        type: 'text',
        placeholder: 'Enter deal name or {{aiAnalysis.company_name}}',
        hint: 'Required for Create Deal action',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'text',
        placeholder: 'Deal amount or {{aiAnalysis.deal_value}}',
        hint: 'Deal value in currency',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'stage',
        label: 'Deal Stage',
        type: 'select',
        options: [
          { value: '1785339585', label: 'Visitor Engaged' },
          { value: '1785339586', label: 'Lead Captured' },
          { value: '1785339587', label: 'Lead Nurtured' },
          { value: '1785339588', label: 'Demo Delivered' },
          { value: '1785339589', label: 'In Negotiation' },
          { value: '1785339590', label: 'Deal Won' },
          { value: '1785339591', label: 'Deal Lost' },
        ],
        hint: 'Select the appropriate deal stage',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Deal description...\n\nUse placeholders like:\n{{aiAnalysis.notes}}\n{{trigger.full_transcript}}',
        hint: 'Optional deal description with AI analysis data',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
    ],
  },
  ZOHO_TOOL: {
    label: 'Zoho CRM',
    icon: Database,
    color: 'bg-red-600',
    description: 'Manage Zoho CRM',
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'GET_DEAL', label: 'Get Deal' },
          { value: 'CREATE_DEAL', label: 'Create Deal' },
          { value: 'UPDATE_DEAL', label: 'Update Deal' },
        ],
      },
      {
        name: 'dealId',
        label: 'Deal ID',
        type: 'text',
        placeholder: 'Enter deal ID or {{aiAnalysis.deal_id}}',
        hint: 'Required for Get Deal and Update Deal actions',
        condition: (data: any) => data.action === 'GET_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'dealName',
        label: 'Deal Name',
        type: 'text',
        placeholder: 'Enter deal name or {{aiAnalysis.company_name}}',
        hint: 'Required for Create Deal action',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'text',
        placeholder: 'Deal amount or {{aiAnalysis.deal_value}}',
        hint: 'Deal value in currency',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'stage',
        label: 'Deal Stage',
        type: 'select',
        options: [
          { value: 'Qualification', label: 'Qualification' },
          { value: 'Needs Analysis', label: 'Needs Analysis' },
          { value: 'Value Proposition', label: 'Value Proposition' },
          { value: 'Id. Decision Makers', label: 'Id. Decision Makers' },
          { value: 'Proposal/Price Quote', label: 'Proposal/Price Quote' },
          { value: 'Negotiation/Review', label: 'Negotiation/Review' },
          { value: 'Closed Won', label: 'Closed Won' },
          { value: 'Closed Lost', label: 'Closed Lost' },
          { value: 'Closed Lost to Competition', label: 'Closed Lost to Competition' },
        ],
        hint: 'Select the appropriate deal stage',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'closingDate',
        label: 'Closing Date',
        type: 'text',
        placeholder: 'YYYY-MM-DD or {{aiAnalysis.close_date}}',
        hint: 'Expected closing date in YYYY-MM-DD format',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'dealType',
        label: 'Deal Type',
        type: 'select',
        options: [
          { value: 'Existing Customer - Upgrade', label: 'Existing Customer - Upgrade' },
          { value: 'Existing Customer - Replacement', label: 'Existing Customer - Replacement' },
          { value: 'Existing Customer - Downgrade', label: 'Existing Customer - Downgrade' },
          { value: 'New Customer', label: 'New Customer' },
        ],
        hint: 'Type of deal',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Deal description...\n\nUse placeholders like:\n{{aiAnalysis.notes}}\n{{trigger.full_transcript}}',
        hint: 'Optional deal description with AI analysis data',
        condition: (data: any) => data.action === 'CREATE_DEAL' || data.action === 'UPDATE_DEAL',
      },
    ],
  },
};

// Custom Node Component
const CustomNode = ({ data, selected }: { data: NodeData; selected: boolean }) => {
  const config = NODE_CONFIGS[data.type];
  const Icon = config.icon;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 ${
        selected ? 'border-[#F74000]' : 'border-border'
      } bg-card min-w-[180px] transition-all`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-muted-foreground border-2 border-border"
      />
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded ${config.color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-foreground font-medium">{data.label}</div>
          <div className="text-xs text-muted-foreground">{config.description}</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-muted-foreground border-2 border-border"
      />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// Node Palette Component
const NodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-4 bg-muted border-b border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">All Apps</h3>
      <div className="flex gap-3">
        {Object.entries(NODE_CONFIGS).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => onDragStart(e, type as NodeType)}
              className="cursor-move"
            >
              <div className="p-3 bg-card rounded-lg border border-border hover:border-[#F74000] transition-colors">
                <div className={`p-3 rounded ${config.color} mb-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-foreground text-sm font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{config.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Right Sidebar for Node Configuration
const NodeConfigSidebar = ({ 
  node, 
  onClose, 
  onUpdate 
}: { 
  node: WorkflowNode | null; 
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
}) => {
  const [formData, setFormData] = useState<any>({});
  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    enabled: node?.data.type === 'AI_AGENT' || node?.data.type === 'OUTBOUND_CALL',
  });

  React.useEffect(() => {
    if (node?.data.config) {
      setFormData(node.data.config);
    } else {
      setFormData({});
    }
  }, [node]);

  if (!node) return null;

  const config = NODE_CONFIGS[node.data.type];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(node.id, {
      ...node.data,
      config: formData,
    });
    onClose();
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="w-96 bg-card border-l border-border p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Configure {config.label}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields.map((field) => {
          // Check if field should be shown based on condition
          if (field.condition && !field.condition(formData)) {
            return null;
          }

          return (
            <div key={field.name}>
              <Label>{field.label}</Label>
              {field.type === 'select' ? (
                <Select
                  value={formData[field.name] || ''}
                  onValueChange={(value) => handleFieldChange(field.name, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.name === 'agentId' || field.name === 'assistantId') && agents?.data ? (
                      agents.data.map((agent: any) => {
                        // MongoDB uses _id, not id
                        const agentId = agent._id || agent.id;
                        if (!agentId) return null;
                        
                        // Handle ObjectId or string format
                        let idString: string;
                        if (typeof agentId === 'object' && agentId.buffer) {
                          // Convert buffer array to hex string without using Buffer
                          const bufferArray = Object.values(agentId.buffer) as number[];
                          idString = bufferArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
                        } else {
                          idString = agentId.toString();
                        }
                          
                        return (
                          <SelectItem key={idString} value={idString}>
                            {agent.name}
                          </SelectItem>
                        );
                      })
                    ) : (
                      field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                />
              ) : (
                <Input
                  type="text"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
              {field.hint && (
                <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
              )}
            </div>
          );
        })}

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1 bg-[#F74000] hover:bg-[#E63600] text-white">
            Save Configuration
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

// Main Workflow Editor Component
function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { id } = useParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Load existing workflow if editing
  const { data: existingWorkflow, isLoading: isLoadingWorkflow } = useQuery({
    queryKey: id ? [`/api/workflows/${id}`] : [''],
    enabled: !!id,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the result
    refetchOnMount: 'always', // Force refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  React.useEffect(() => {
    if (existingWorkflow?.data) {
      setWorkflowName(existingWorkflow.data.name);
      
      // Transform nodes from database format to React Flow format
      const transformedNodes = (existingWorkflow.data.nodes || []).map((node: any) => ({
        id: node.id,
        type: 'custom',
        position: node.position,
        data: {
          label: NODE_CONFIGS[node.type as NodeType].label,
          type: node.type,
          config: node.data,
        },
      }));
      
      setNodes(transformedNodes);
      setEdges(existingWorkflow.data.edges || []);
    }
  }, [existingWorkflow, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => 
        addEdge({
          ...params,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#F74000',
          },
        } as Edge, eds)
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: NODE_CONFIGS[type].label,
          type,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as any as WorkflowNode);
  }, []);

  const onNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const onNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Save workflow mutation
  const saveWorkflow = useMutation({
    mutationFn: async (data: any) => {
      const url = id ? `/api/workflows/${id}` : '/api/workflows';
      const method = id ? 'PUT' : 'POST';
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: id ? 'Workflow updated' : 'Workflow created',
        description: 'Your workflow has been saved successfully.',
      });
      // Invalidate workflows list cache
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      // Invalidate specific workflow cache if editing
      if (id) {
        queryClient.invalidateQueries({ queryKey: [`/api/workflows/${id}`] });
      }
      setLocation('/workflows');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save workflow',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!workflowName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a workflow name',
        variant: 'destructive',
      });
      return;
    }

    saveWorkflow.mutate({
      name: workflowName,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        position: node.position,
        data: node.data.config || {},
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
      })),
      isActive: true,
    });
  };

  // Show loading state when fetching existing workflow
  if (id && isLoadingWorkflow) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground">Loading workflow...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workflows">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-64"
              placeholder="Workflow name"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saveWorkflow.isPending}
              className="bg-[#F74000] hover:bg-[#E63600] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveWorkflow.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* Node Palette */}
      <NodePalette />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Workflow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background className="bg-muted" gap={16} />
            <Controls className="bg-card border-border" />
            <MiniMap className="bg-card border-border" nodeColor={(node) => {
              const config = NODE_CONFIGS[node.data.type as NodeType];
              return config?.color.includes('green') ? '#16a34a' : 
                     config?.color.includes('blue') ? '#2563eb' :
                     config?.color.includes('purple') ? '#9333ea' :
                     config?.color.includes('yellow') ? '#eab308' :
                     config?.color.includes('red') ? '#dc2626' :
                     config?.color.includes('orange') ? '#ea580c' : '#6b7280';
            }} />
          </ReactFlow>
        </div>

        {/* Right Sidebar */}
        <NodeConfigSidebar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={onNodeUpdate}
        />
      </div>
    </div>
  );
}

// Helper function to get URL params
function useParams() {
  const location = useLocation();
  const match = location[0].match(/\/workflows\/edit\/(\w+)/);
  return { id: match ? match[1] : null };
}

// Wrapper component with ReactFlowProvider
export default function CreateWorkflow() {
  return (
    <Layout>
      <ReactFlowProvider>
        <WorkflowEditor />
      </ReactFlowProvider>
    </Layout>
  );
}