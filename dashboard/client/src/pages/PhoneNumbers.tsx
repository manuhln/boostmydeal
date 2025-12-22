import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { Phone, Search, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { apiRequest } from "@/lib/queryClient";

const voxsunSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number is required"),
  countryCode: z.string().min(1, "Country code is required"),
  accountSid: z.string().min(1, "Account SID is required"),
  authToken: z.string().min(1, "Auth Token is required"),
});

const twilioSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number is required"),
  countryCode: z.string().min(1, "Country code is required"),
  accountSid: z.string().min(1, "Account SID is required"),
  authToken: z.string().min(1, "Auth Token is required"),
});

type VoxSunFormData = z.infer<typeof voxsunSchema>;
type TwilioFormData = z.infer<typeof twilioSchema>;

export default function PhoneNumbers() {
  const [activeTab, setActiveTab] = useState("voxsun");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState<{id: string, number: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch phone numbers
  const { data: phoneNumbersData, isLoading } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });

  const phoneNumbers = phoneNumbersData?.data?.phoneNumbers || [];

  // Delete phone number mutation
  const deleteMutation = useMutation({
    mutationFn: async (phoneNumberId: string) => {
      await apiRequest("DELETE", `/api/phone-numbers/${phoneNumberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      toast({
        title: "Phone Number Deleted",
        description: "The phone number has been successfully deleted.",
      });
      setSelectedPhoneNumber(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete phone number.",
        variant: "destructive",
      });
    },
  });

  const voxsunForm = useForm<VoxSunFormData>({
    resolver: zodResolver(voxsunSchema),
    defaultValues: {
      phoneNumber: "",
      countryCode: "",
      accountSid: "",
      authToken: "",
    },
  });

  const twilioForm = useForm<TwilioFormData>({
    resolver: zodResolver(twilioSchema),
    defaultValues: {
      phoneNumber: "",
      countryCode: "",
      accountSid: "",
      authToken: "",
    },
  });

  const onVoxSunSubmit = async (data: VoxSunFormData) => {
    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          countryCode: data.countryCode,
          provider: 'voxsun',
          accountSid: data.accountSid,
          authToken: data.authToken
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "VoxSun Configuration",
          description: "VoxSun phone number configuration saved successfully",
        });
        voxsunForm.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to save VoxSun configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving VoxSun configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save VoxSun configuration",
        variant: "destructive"
      });
    }
  };

  const onTwilioSubmit = async (data: TwilioFormData) => {
    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          countryCode: data.countryCode,
          provider: 'twilio',
          accountSid: data.accountSid,
          authToken: data.authToken
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Twilio Configuration", 
          description: "Twilio phone number configuration saved successfully",
        });
        twilioForm.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to save Twilio configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving Twilio configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save Twilio configuration",
        variant: "destructive"
      });
    }
  };

  const handleDeletePhoneNumber = (e: React.MouseEvent, phoneNumberId: string, phoneNumber: string) => {
    e.stopPropagation();
    setPhoneToDelete({ id: phoneNumberId, number: phoneNumber });
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (phoneToDelete) {
      deleteMutation.mutate(phoneToDelete.id);
      setDeleteModalOpen(false);
      setPhoneToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setPhoneToDelete(null);
  };

  const filteredPhoneNumbers = phoneNumbers.filter((phone: any) =>
    phone.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    phone.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'twilio':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'voxsun':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">Loading phone numbers...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Phone Numbers List First */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">Phone Numbers</h2>
              <p className="text-muted-foreground text-sm lg:text-base">Manage your phone number configurations</p>
            </div>
            <Button 
              onClick={() => {
                setSelectedPhoneNumber(null);
                voxsunForm.reset();
                twilioForm.reset();
              }}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phone Number
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search Phone Numbers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Phone Numbers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPhoneNumbers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {searchTerm ? "No phone numbers found matching your search." : "No phone numbers configured yet."}
            </div>
          ) : (
            filteredPhoneNumbers.map((phone: any, index: number) => {
              const phoneId = phone._id || `phone-${index}`;
              
              return (
                <Card key={phoneId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPhoneNumber(phone)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{phone.phoneNumber}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProviderColor(phone.provider)}`}>
                              {phone.provider.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Account: {phone.accountSid?.substring(0, 10)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added: {new Date(phone.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeletePhoneNumber(e, phoneId, phone.phoneNumber)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Provider Configuration Forms Below */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Configure New Phone Number</h3>
            <p className="text-muted-foreground mb-6">Add a new phone number configuration for voice providers</p>
          </div>

          {/* Provider Tabs */}
          <div className="flex space-x-8 mb-6 border-b border-border">
            <button
              onClick={() => {
                setActiveTab("voxsun");
                voxsunForm.reset();
                twilioForm.reset();
              }}
              className={`px-2 py-3 font-medium transition-all relative ${
                activeTab === "voxsun"
                  ? "text-[#F74000]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              VoxSun
              {activeTab === "voxsun" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F74000]" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("twilio");
                voxsunForm.reset();
                twilioForm.reset();
              }}
              className={`px-2 py-3 font-medium transition-all relative ${
                activeTab === "twilio"
                  ? "text-[#F74000]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Twilio
              {activeTab === "twilio" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F74000]" />
              )}
            </button>
          </div>

          {/* Configuration Forms */}
          {/* Tab Content */}
                  {activeTab === "voxsun" && (
                    <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>VoxSun Configuration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Form {...voxsunForm}>
                          <form onSubmit={voxsunForm.handleSubmit(onVoxSunSubmit)} className="space-y-4">
                            <FormField
                              control={voxsunForm.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={voxsunForm.control}
                              name="countryCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter country code (e.g., +1)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={voxsunForm.control}
                              name="accountSid"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account SID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter VoxSun Account SID" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={voxsunForm.control}
                              name="authToken"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Auth Token</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="Enter VoxSun Auth Token" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button type="submit" className="w-full">
                              Save VoxSun Configuration
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </div>
                  )}

                  {activeTab === "twilio" && (
                    <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Twilio Configuration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Form {...twilioForm}>
                          <form onSubmit={twilioForm.handleSubmit(onTwilioSubmit)} className="space-y-4">
                            <FormField
                              control={twilioForm.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter phone number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={twilioForm.control}
                              name="countryCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter country code (e.g., +1)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={twilioForm.control}
                              name="accountSid"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account SID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter Twilio Account SID" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={twilioForm.control}
                              name="authToken"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Auth Token</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="Enter Twilio Auth Token" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button type="submit" className="w-full">
                              Save Twilio Configuration
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </div>
                  )}
                </div>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Phone Number"
          description="Are you sure you want to delete this phone number? This will remove it from all configurations and cannot be undone."
          itemName={phoneToDelete?.number}
          isLoading={deleteMutation.isPending}
        />
    </Layout>
  );
}