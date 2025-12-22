import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateAgent, useUpdateAgent } from "@/hooks/useAgents";
import { useProviders, useSyncAgent } from "@/hooks/useProviders";
import { useToast } from "@/hooks/use-toast";
import { insertAgentSchema } from "@shared/schema";
import type { Agent } from "@shared/schema";
import { VOICE_PROVIDERS, AI_MODELS } from "@/lib/types";

interface AgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent;
}

const formSchema = insertAgentSchema.extend({
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().min(1).max(4000),
});

type FormData = z.infer<typeof formSchema>;

export function AgentModal({ open, onOpenChange, agent }: AgentModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("test");
  
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const { data: providers } = useProviders();
  const syncAgent = useSyncAgent();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: agent?.name || "Sarah",
      gender: agent?.gender || "Female",
      model: agent?.model || "GPT-3.5 Turbo",
      voiceProvider: agent?.voiceProvider || "elevenlabs",
      voiceModel: agent?.voiceModel || "eleven_multilingual_v2",
      systemPrompt: agent?.systemPrompt || "",
      temperature: Number(agent?.temperature) || 0.7,
      maxTokens: agent?.maxTokens || 150,
      country: agent?.country || "United States",
      languages: agent?.languages || ["English"],
      cost: Number(agent?.cost) || 0,
      latency: Number(agent?.latency) || 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      let savedAgent;
      if (agent) {
        savedAgent = await updateAgent.mutateAsync({
          id: agent.id,
          agent: data,
        });
        toast({
          title: "Success",
          description: "Agent updated successfully",
        });
      } else {
        savedAgent = await createAgent.mutateAsync(data);
        toast({
          title: "Success",
          description: "Agent created successfully",
        });
      }

      // Auto-sync with VAPI if configured
      const vapiProvider = providers?.find(p => p.type === 'vapi' && p.isConfigured);
      if (vapiProvider && savedAgent) {
        try {
          await syncAgent.mutateAsync({
            agentId: savedAgent.id || agent?.id,
            providerType: 'vapi'
          });
          toast({
            title: "Synced",
            description: "Agent synced with VAPI successfully",
          });
        } catch (syncError) {
          // Don't fail the whole operation if sync fails
          console.warn("Failed to sync with VAPI:", syncError);
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save agent",
        variant: "destructive",
      });
    }
  };

  const selectedProvider = VOICE_PROVIDERS.find(p => p.id === form.watch("voiceProvider"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{agent ? "Edit Agent" : "New Agent"}</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={createAgent.isPending || updateAgent.isPending}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your AI voice call agents
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Test Controls */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="test">Test</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="talk">Talk to Assistant</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-4">Metrics</h4>
                <div className="space-y-4">
                  <div>
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost</FormLabel>
                          <FormControl>
                            <div className="text-2xl font-bold">
                              ${Number(field.value).toFixed(2)}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-4 mt-8">
                  <div>
                    <FormField
                      control={form.control}
                      name="latency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latency</FormLabel>
                          <FormControl>
                            <div className="text-2xl font-bold">
                              {Number(field.value).toFixed(2)}s
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Model Details */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Model Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assistant Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Non-binary">Non-binary</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AI_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Voice Configuration */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Voice Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="voiceProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VOICE_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name}
                              {providers?.find(p => p.type === provider.id)?.isConfigured && (
                                <span className="ml-2 text-xs text-emerald-600">✓</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voiceModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice Model</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedProvider?.models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Enter the system prompt that defines how your AI assistant should behave..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Advanced Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={2}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Focused</span>
                        <span>Creative</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
