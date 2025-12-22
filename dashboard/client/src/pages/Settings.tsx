import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CreditCard,
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Bell,
  XCircle,
  DollarSign,
  Calendar,
  TrendingUp,
  UserPlus,
  Mail,
  Clock,
  Crown,
  User,
  Moon,
  Sun,
  Info,
  Send,
  AlertTriangle
} from "lucide-react";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Switch } from '@/components/ui/switch'; // Ensure Switch is imported
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Initialize Stripe if public key is available
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Payment form component
const PaymentForm = ({ clientSecret, amount, onSuccess }: { clientSecret: string; amount: number; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/settings',
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // Payment successful, update backend
      try {
        await apiRequest("POST", "/api/billing/payment-success", { 
          amount: amount 
        });

        queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
        queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });

        toast({
          title: "Payment Successful",
          description: `Payment of $${amount.toFixed(2)} processed successfully!`,
        });
      } catch (err) {
        console.error("Failed to update payment status:", err);
      }
      setIsProcessing(false);
      onSuccess(); // Close the modal and refresh billing data
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-[#F74000] hover:bg-[#F74000]/90"
      >
        {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </Button>
    </form>
  );
};

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("theme");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<{ clientSecret: string; amount: number } | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(10); // Default to $10
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const queryClient = useQueryClient();

  // Team Management State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [inviteToCancel, setInviteToCancel] = useState<any>(null);
  
  // Invoice Management State
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  // Fetch billing data
  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey: ["/api/billing"],
  });

  // Fetch payment history
  const { data: paymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/billing/history"],
  });

  // Fetch invoice scheduler status
  const { data: schedulerStatus, isLoading: schedulerLoading } = useQuery({
    queryKey: ["/api/billing/scheduler-status"],
  });

  // Create payment intent mutation
  const createPaymentIntent = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest("POST", "/api/billing/create-payment-intent", { amount });
    },
    onSuccess: (data, amount) => {
      if (data.success && data.data.clientSecret) {
        setPaymentIntent({
          clientSecret: data.data.clientSecret,
          amount: amount
        });
        setShowPaymentModal(true);
        setShowCreditDialog(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment intent",
        variant: "destructive",
      });
    },
  });

  const handleAddCredits = () => {
    if (creditAmount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount of at least $1.00",
        variant: "destructive",
      });
      return;
    }
    createPaymentIntent.mutate(creditAmount);
  };

  // Send manual invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      // Send invoice for current month
      const now = new Date();
      const month = now.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
      const year = now.getFullYear();
      
      return await apiRequest("POST", "/api/billing/send-invoice", {
        month,
        year
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice sent successfully",
      });
      setIsSendingInvoice(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
      setIsSendingInvoice(false);
    },
  });

  const handleSendInvoice = () => {
    setIsSendingInvoice(true);
    sendInvoiceMutation.mutate();
  };

  // Fetch team members
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['/api/team/members'],
    queryFn: async () => {
      const response = await fetch('/api/team/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
  });

  // Fetch pending invites
  const { data: invites, isLoading: loadingInvites } = useQuery({
    queryKey: ['/api/team/invites'],
    queryFn: async () => {
      const response = await fetch('/api/team/invites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch invites');
      return response.json();
    },
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: 'admin' | 'user' }) => {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send invitation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team invitation sent successfully",
      });
      setIsAddUserDialogOpen(false);
      setInviteEmail("");
      setInviteRole('user');
      queryClient.invalidateQueries({ queryKey: ['/api/team/invites'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/team/member/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  // Cancel invite mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(`/api/team/invite/${inviteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to cancel invitation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation cancelled successfully",
      });
      setInviteToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['/api/team/invites'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const response = await fetch(`/api/team/member/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    },
  });

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveTab(sectionId);
  };

  // Team Management Helper Functions
  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleRemoveMember = (member: any) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleCancelInvite = (invite: any) => {
    setInviteToCancel(invite);
  };

  const confirmRemoveMember = () => {
    if (memberToDelete) {
      removeMemberMutation.mutate(memberToDelete._id);
    }
  };

  const confirmCancelInvite = () => {
    if (inviteToCancel) {
      cancelInviteMutation.mutate(inviteToCancel._id);
    }
  };



  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Team Management interfaces
  interface TeamMember {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'owner' | 'admin' | 'user';
    createdAt: string;
  }

  interface TeamInvite {
    _id: string;
    email: string;
    role: 'admin' | 'user';
    status: 'pending' | 'accepted' | 'expired';
    createdAt: string;
    expiresAt: string;
    invitedBy: {
      firstName: string;
      lastName: string;
    };
  }

  const billing = (billingData as any)?.data || {
    credits: { totalBalance: 0 },
    usage: { totalCallCosts: 0 },
    lastPaymentDate: null,
    lastPaymentAmount: null,
  };

  const payments = (paymentHistory as any)?.data || [];

  return (
    <TooltipProvider>
    <Layout>
      {/* Header */}
      <header className="bg-background border-b border-primary/30 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
            <p className="text-muted-foreground mt-1">
              Manage your account, billing and team settings
            </p>
          </div>
        </div>
      </header>

      {/* Credit Amount Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Credits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="creditAmount" className="text-white">Credit Amount (USD)</Label>
              <Input
                id="creditAmount"
                type="number"
                min="1"
                step="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-sm text-gray-400 mt-1">
                Minimum amount: $1.00
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreditDialog(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCredits}
                disabled={createPaymentIntent.isPending || creditAmount < 1}
                className="bg-[#F74000] hover:bg-[#F74000]/90 text-white"
              >
                {createPaymentIntent.isPending ? "Processing..." : `Add $${creditAmount.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {paymentIntent && stripePromise ? (
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret: paymentIntent.clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#F74000',
                      colorBackground: '#1F2937',
                      colorText: '#FFFFFF',
                      colorDanger: '#EF4444',
                      fontFamily: 'system-ui, sans-serif',
                      spacingUnit: '4px',
                      borderRadius: '8px',
                    }
                  },
                }}
              >
                <PaymentForm 
                  clientSecret={paymentIntent.clientSecret} 
                  amount={paymentIntent.amount}
                  onSuccess={() => {
                    setShowPaymentModal(false);
                    setPaymentIntent(null);
                    queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/billing/history"] });
                  }}
                />
              </Elements>
            ) : (
              <div className="text-center text-gray-400">
                {!stripePromise ? "Payment processing is not configured. Please contact support." : "Loading payment form..."}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-background p-4 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-3 bg-muted dark:bg-gray-900 mb-6">
            <TabsTrigger value="theme" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs lg:text-sm">
              Theme
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs lg:text-sm">
              Billing
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs lg:text-sm">
              Team
            </TabsTrigger>
          </TabsList>



          {/* Theme Tab Content */}
          <TabsContent value="theme" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  Theme Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme-toggle" className="text-foreground font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark theme
                    </p>
                  </div>
                  <Switch
                    id="theme-toggle"
                    checked={isDarkMode}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab Content */}
          <TabsContent value="billing" className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground mb-6">Billing & Credits</h3>

            {/* Credit Balance */}
            <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-primary">Credit Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billingLoading ? (
                <div className="text-center text-gray-400">Loading billing information...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-[#F74000]" />
                        <span className="text-sm text-gray-400">Available Credits</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        ${billing.credits?.totalBalance?.toFixed(4) || '0.0000'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-[#F74000]" />
                        <span className="text-sm text-gray-400">Total Purchased Credits</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-gray-500 hover:text-gray-300" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-white">
                            <p className="text-sm">
                              Free Credits: ${billing.credits?.freeCredits?.toFixed(4) || '0.0000'}<br />
                              Paid Credits: ${billing.credits?.paidCredits?.toFixed(4) || '0.0000'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        ${((billing.credits?.freeCredits || 0) + (billing.credits?.paidCredits || 0)).toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {billing.lastPaymentDate && (
                    <div className="pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Last Payment</span>
                        <span className="text-white">
                          ${billing.lastPaymentAmount?.toFixed(2)} on {new Date(billing.lastPaymentDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Low Credit Warning */}
                  {billing && billing.credits?.totalBalance < 1 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        ⚠️ Low credit balance! Add funds to continue making calls.
                      </p>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-white"
                    onClick={() => setShowCreditDialog(true)}
                    disabled={createPaymentIntent.isPending}
                  >
                    Add Credits
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-[#F74000]">Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-gray-400">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Payments are processed securely through Stripe</span>
                </div>
                {!stripePromise && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      Payment processing is not configured. Please contact support to set up billing.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-[#F74000]">Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Description</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={4} className="text-center text-gray-400">
                        Loading payment history...
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={4} className="text-center text-gray-400">
                        No payment history yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((item: any, index: number) => (
                      <TableRow key={item._id || index} className="border-gray-600">
                        <TableCell className="text-white">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 
                           item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-white">
                          {item.description || 'Credit Top-up'}
                        </TableCell>
                        <TableCell className="text-white">
                          ${item.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            item.status === 'completed' 
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : item.status === 'pending'
                              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Invoice Management */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-primary">Invoice Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scheduler Status */}
              <div className="p-4 bg-muted border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${schedulerLoading ? 'bg-yellow-500' : 
                      schedulerStatus?.data?.running ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-foreground">Automated Invoice Scheduler</h4>
                      <p className="text-sm text-muted-foreground">
                        {schedulerLoading ? 'Checking status...' : 
                          schedulerStatus?.data?.running 
                            ? `Running - ${schedulerStatus.data.nextRun || 'Next run scheduled'}`
                            : 'Not running'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Monthly on 1st</span>
                  </div>
                </div>
              </div>

              {/* Manual Invoice Control */}
              <div className="flex items-center justify-between p-4 bg-muted border border-border rounded-lg">
                <div>
                  <h4 className="font-medium text-foreground">Send Manual Invoice</h4>
                  <p className="text-sm text-muted-foreground">
                    Send an invoice for the current month manually
                  </p>
                </div>
                <Button
                  onClick={handleSendInvoice}
                  disabled={isSendingInvoice || sendInvoiceMutation.isPending}
                  className="bg-[#F74000] hover:bg-[#F74000]/90 text-white"
                >
                  {isSendingInvoice || sendInvoiceMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invoice
                    </>
                  )}
                </Button>
              </div>

              {/* Invoice Information */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Invoice Information</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Invoices are automatically sent on the 1st of each month for the previous month's usage. 
                      Only organizations with payment activity or credit usage will receive invoices.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* Team Tab Content */}
          <TabsContent value="team" className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground mb-6">Team Management</h3>

            {/* Team Members Section */}
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-primary">Team Members</CardTitle>
                  <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#F74000] hover:bg-[#F74000]/90 text-white">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email" className="text-white">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role" className="text-white">Role</Label>
                          <Select value={inviteRole} onValueChange={(value: 'admin' | 'user') => setInviteRole(value)}>
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddUserDialogOpen(false)}
                          className="border-gray-700 text-white hover:bg-gray-800"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendInvite}
                          disabled={sendInviteMutation.isPending}
                          className="bg-[#F74000] hover:bg-[#F74000]/90"
                        >
                          {sendInviteMutation.isPending ? "Sending..." : "Send Invitation"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <div className="text-center py-8 text-gray-400">Loading team members...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600">
                          <TableHead className="text-gray-300">Member</TableHead>
                          <TableHead className="text-gray-300">Role</TableHead>
                          <TableHead className="text-gray-300">Joined</TableHead>
                          <TableHead className="text-gray-300 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members?.data?.map((member: TeamMember) => (
                          <TableRow key={member._id} className="border-gray-600">
                            <TableCell className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-gray-800 text-white">
                                  {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-white">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-sm text-gray-400">{member.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(member.role)}
                                <Badge variant={getRoleBadgeVariant(member.role)}>
                                  {member.role}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(member.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {member.role !== 'owner' && (
                                  <>
                                    <Select
                                      value={member.role}
                                      onValueChange={(value: 'admin' | 'user') =>
                                        updateRoleMutation.mutate({ userId: member._id, role: value })
                                      }
                                    >
                                      <SelectTrigger className="w-32 bg-gray-900 border-gray-700 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-900 border-gray-700">
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveMember(member)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

            {/* Pending Invites Section */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Pending Invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInvites ? (
                    <div className="text-center py-8 text-gray-400">Loading invitations...</div>
                  ) : invites?.data?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No pending invitations</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600">
                          <TableHead className="text-gray-300">Email</TableHead>
                          <TableHead className="text-gray-300">Role</TableHead>
                          <TableHead className="text-gray-300">Invited By</TableHead>
                          <TableHead className="text-gray-300">Expires</TableHead>
                          <TableHead className="text-gray-300 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites?.data?.map((invite: TeamInvite) => (
                          <TableRow key={invite._id} className="border-gray-600">
                            <TableCell className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-white">{invite.email}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(invite.role)}
                                <Badge variant={getRoleBadgeVariant(invite.role)}>
                                  {invite.role}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {invite.invitedBy.firstName} {invite.invitedBy.lastName}
                            </TableCell>
                            <TableCell className="flex items-center gap-2 text-gray-400">
                              <Clock className="h-4 w-4" />
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvite(invite)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

            {/* Team Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{members?.data?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Team Members</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {members?.data?.filter((m: TeamMember) => m.role === 'admin' || m.role === 'owner').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Admins</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{invites?.data?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Pending Invites</p>
                    </div>
                    <Bell className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {members?.data?.filter((m: TeamMember) => m.role === 'user').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Users</p>
                    </div>
                    <User className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Member Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmRemoveMember}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member? They will lose access to the organization immediately."
        itemName={memberToDelete ? `${memberToDelete.firstName} ${memberToDelete.lastName}` : ''}
        isLoading={removeMemberMutation.isPending}
      />

      {/* Cancel Invite Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!inviteToCancel}
        onClose={() => setInviteToCancel(null)}
        onConfirm={confirmCancelInvite}
        title="Cancel Invitation"
        description="Are you sure you want to cancel this invitation? The recipient will no longer be able to join your team using this invite."
        itemName={inviteToCancel?.email || ''}
        isLoading={cancelInviteMutation.isPending}
      />
    </Layout>
    </TooltipProvider>
  );
}