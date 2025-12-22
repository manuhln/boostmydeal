import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { UserPlus, CheckCircle } from "lucide-react";
import { BoostMyLeadLogo } from "@/components/BoostMyLeadLogo";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [isComplete, setIsComplete] = useState(false);

  const acceptInviteMutation = useMutation({
    mutationFn: async (data: { name: string; password: string }) => {
      const response = await fetch(`/api/team/accept-invite/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept invitation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsComplete(true);
      toast({
        title: "Success!",
        description: "You have successfully joined the team. You can now log in with your credentials.",
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    acceptInviteMutation.mutate({
      name: formData.name,
      password: formData.password,
    });
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <BoostMyLeadLogo width={120} height={60} className="mx-auto mb-8" />
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-green-600/20 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Team!</h1>
            <p className="text-gray-400 mb-6">
              Your account has been created successfully. You will be redirected to the login page shortly.
            </p>
            <Button 
              onClick={() => navigate('/login')}
              className="bg-[#3B82F6] hover:bg-[#E63900] w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <BoostMyLeadLogo width={120} height={60} className="mx-auto mb-8" />
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-[#3B82F6]/20 rounded-full">
              <UserPlus className="h-8 w-8 text-[#3B82F6]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Accept Team Invitation</h1>
          <p className="text-gray-400">
            Complete your account setup to join the team
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Create Your Account</CardTitle>
            <CardDescription className="text-gray-400">
              Set up your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  placeholder="Enter your full name"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  placeholder="Create a password (min. 6 characters)"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  placeholder="Confirm your password"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={acceptInviteMutation.isPending}
                className="w-full bg-[#3B82F6] hover:bg-[#E63900] text-white"
              >
                {acceptInviteMutation.isPending ? "Creating Account..." : "Accept Invitation & Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <button
              onClick={() => navigate('/login')}
              className="text-[#3B82F6] hover:text-[#E63900] font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}