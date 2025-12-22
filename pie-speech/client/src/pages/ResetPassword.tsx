import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoostMyLeadLogo } from "@/components/BoostMyLeadLogo";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Key, ArrowLeft, CheckCircle } from "lucide-react";

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/(?=.*[0-9])/, "Password must contain at least 1 number")
    .regex(/(?=.*[!@#$%^&*(),.?":{}|<>])/, "Password must contain at least 1 special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  console.log('ResetPassword component rendered, current location:', window.location.href);

  const form = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    console.log('ResetPassword: URL search params:', window.location.search);
    console.log('ResetPassword: Token param:', tokenParam);
    console.log('ResetPassword: Full URL:', window.location.href);
    
    // Check if token is in hash (for cases where it might be passed differently)
    if (!tokenParam && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashToken = hashParams.get('token');
      console.log('ResetPassword: Checking hash for token:', hashToken);
      if (hashToken) {
        setToken(hashToken);
        return;
      }
    }
    
    if (!tokenParam) {
      console.log('ResetPassword: No token found, redirecting to forgot-password');
      toast({
        title: "Invalid reset link",
        description: "This password reset link is invalid or incomplete. Please request a new password reset.",
        variant: "destructive",
      });
      setLocation('/forgot-password');
      return;
    }
    console.log('ResetPassword: Token set:', tokenParam);
    setToken(tokenParam);
  }, [setLocation, toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!token) throw new Error('No reset token found');
      return await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Password reset successful!",
        description: "Your password has been updated. You can now log in.",
      });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to reset password";
      toast({
        title: "Reset failed",
        description: message,
        variant: "destructive",
      });
      
      // If token is invalid or expired, redirect to forgot password
      if (error.message && error.message.includes('Invalid or expired')) {
        setTimeout(() => {
          setLocation('/forgot-password');
        }, 2000);
      }
    }
  });

  const onSubmit = async (data: FormData) => {
    resetPasswordMutation.mutate(data);
  };

  const handleLoginRedirect = () => {
    setLocation('/login');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <BoostMyLeadLogo width={100} height={50} className="hover:opacity-80 transition-opacity" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            {resetSuccess ? "Password Reset Complete!" : "Set New Password"}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {resetSuccess 
              ? "Your password has been successfully updated" 
              : "Enter your new password below"
            }
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-foreground flex items-center justify-center gap-2">
              {resetSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Success
                </>
              ) : (
                <>
                  <Key className="w-5 h-5 text-[#3B82F6]" />
                  New Password
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resetSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-foreground">All set!</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
                <Button
                  onClick={handleLoginRedirect}
                  className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-foreground border-0"
                >
                  Continue to Login
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Must contain at least 6 characters, 1 number, and 1 special character
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm new password"
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={resetPasswordMutation.isPending}
                    className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-foreground border-0"
                  >
                    {resetPasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80 font-medium inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Secure password reset with encrypted validation
          </p>
        </div>
      </div>
    </div>
  );
}