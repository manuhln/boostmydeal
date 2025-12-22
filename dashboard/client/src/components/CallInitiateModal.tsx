import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Send } from "lucide-react";
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
import { useAgents } from "@/hooks/useAgents";
import { useInitiateCall } from "@/hooks/useCalls";
import { useToast } from "@/hooks/use-toast";

interface CallInitiateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  assistantId: z.string().min(1, "Please select an assistant"),
  toNumber: z.string().min(10, "Please enter a valid phone number"),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CallInitiateModal({ open, onOpenChange }: CallInitiateModalProps) {
  const { toast } = useToast();
  const { data: agentsResponse } = useAgents();
  const initiateCall = useInitiateCall();
  
  const agents = agentsResponse?.data || [];
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assistantId: "",
      toNumber: "",
      message: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    console.log("🔄 Form submission started with data:", data);
    console.log("🔄 Validation state:", form.formState.errors);
    
    try {
      console.log("🚀 About to call initiateCall.mutateAsync with:", {
        assistantId: data.assistantId,
        toNumber: data.toNumber,
        message: data.message,
      });
      
      const result = await initiateCall.mutateAsync({
        assistantId: data.assistantId,
        toNumber: data.toNumber,
        message: data.message,
      });

      console.log("✅ Call initiation result:", result);
      toast({
        title: "Call Initiated",
        description: result?.message || "Call queued successfully",
      });
      
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("❌ Call initiation error:", error);
      console.error("❌ Error details:", {
        message: error?.message,
        status: error?.status,
        response: error?.response,
        stack: error?.stack
      });
      
      // Handle low credits error (402 Payment Required)
      if (
        error?.status === 402 ||
        error?.message?.toLowerCase()?.includes("low credits")
      ) {
        toast({
          title: "Low Credits",
          description: "Please add more credits to make call.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Call Failed",
          description: error?.message || "Failed to initiate call. Please check your configuration.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5" />
            Initiate Call
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assistantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Assistant</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an assistant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agents?.map((agent: any) => {
                        const agentId = agent._id?.toString() || agent.id?.toString();
                        return (
                          <SelectItem key={agentId} value={agentId}>
                            {agent.name} ({agent.gender}, {agent.voiceProvider})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="+1234567890"
                      type="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Custom message for the call..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={initiateCall.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {initiateCall.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Initiating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Start Call
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}