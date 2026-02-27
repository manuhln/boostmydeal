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
import { useSignup } from "@/hooks/useAuth";
import { UserPlus, Building2 } from "lucide-react";
import { BoostMyLeadWhiteLogo } from "@/components/BoostmyLeadwhite";
import { useTheme } from "@/contexts/ThemeContext";

const signupSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  organizationSlug: z
    .string()
    .min(1, "Organization slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/(?=.*[0-9])/, "Password must contain at least 1 number")
    .regex(/(?=.*[!@#$%^&*(),.?":{}|<>])/, "Password must contain at least 1 special character"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  website: z.string().optional(),
});

type FormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const signup = useSignup();
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme()
  const form = useForm<FormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: "",
      organizationSlug: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      website: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await signup(data);

      toast({
        title: "Account Created!",
        description: "Your organization has been set up successfully.",
      });

      // Add a longer delay to ensure token is properly stored and auth state updated
      setTimeout(() => {
        console.log('Redirecting to dashboard, token exists:', !!localStorage.getItem('authToken'));
        window.location.href = "/";
      }, 500);
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug from organization name
  const handleOrganizationNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    form.setValue("organizationSlug", slug);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            {theme === 'light' ? <BoostMyLeadWhiteLogo width={100} height={50} className="hover:opacity-80 transition-opacity" /> : <BoostMyLeadLogo width={100} height={50} className="hover:opacity-80 transition-opacity" />}
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Create your organization
          </h2>
          <p className="mt-2 text-sm text-foreground">
            Start managing your voice AI agents today
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Sign Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Acme Corporation"
                          disabled={isLoading}
                          onChange={(e) => {
                            field.onChange(e);
                            handleOrganizationNameChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Slug</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="acme-corporation"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="John"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Doe"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          placeholder="john@acme.com"
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
                          placeholder="Create a secure password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://acme.com"
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
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-[#F74000] hover:text-[#E63600] border-b border-[#F74000] hover:border-[#E63600]">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}