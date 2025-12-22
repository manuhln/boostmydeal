import { useState } from "react";
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
import { useLogin } from "@/hooks/useAuth";
import { LogIn, Building2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await login(data);
      
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      
      // Add a longer delay to ensure token is properly stored and auth state updated
      setTimeout(() => {
        console.log('Redirecting to dashboard, token exists:', !!localStorage.getItem('authToken'));
        window.location.href = "/";
      }, 500);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <BoostMyLeadLogo width={100} height={50} className="hover:opacity-80 transition-opacity" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your voice AI management platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LogIn className="mr-2 h-5 w-5" />
              Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter your password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    Don't have an account?{" "}
                    <Link href="/signup" className="font-medium text-[#F74000] hover:text-[#E63600] border-b border-[#F74000] hover:border-[#E63600]">
                      Sign up for free
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-400">
            Don't have an account?{" "}
            <Link href="/signup" className="text-[#F74000] hover:text-[#F74000]/80 font-medium">
              Sign up here
            </Link>
          </p>
          <p className="text-sm text-gray-400">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="text-[#F74000] hover:text-[#F74000]/80 font-medium">
              Reset it here
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            Secure authentication with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}