import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  profileImage?: string;
  phone?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
  };
}

export interface AuthResponse {
  user: User;
  organization: Organization;
}

export function useAuth() {
  const token = localStorage.getItem('authToken');
  
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 0, // Always fresh
    gcTime: 0, // Don't cache
    enabled: !!token, // Only run query if token exists
    refetchOnMount: true,
  });

  // Removed continuous logging to prevent console spam

  // Token verification removed to prevent re-renders

  return {
    user: data?.user,
    organization: data?.organization,
    isLoading: isLoading && !!token, // Only show loading if we have a token
    isAuthenticated: !!(token && data?.user),
    error,
  };
}

export function useLogin() {
  return async (credentials: { email: string; password: string }) => {
    console.log('Login function called with:', credentials.email);
    
    const data = await apiRequest("POST", "/api/auth/login", credentials);
    
    console.log('Login response received:', { hasToken: !!data.token, user: data.user?.email });
    
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      console.log('Token stored in localStorage, length:', data.token.length);
      
      // Verify token was stored
      const storedToken = localStorage.getItem('authToken');
      console.log('Token verification - stored correctly:', storedToken === data.token);
      
      // Invalidate the auth query to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } else {
      console.error('No token received in login response');
    }
    
    return data;
  };
}

export function useSignup() {
  return async (signupData: {
    organizationName: string;
    organizationSlug: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    website?: string;
  }) => {
    const data = await apiRequest("POST", "/api/auth/signup", signupData);
    
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      // Invalidate the auth query to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
    
    return data;
  };
}

export function useLogout() {
  return () => {
    localStorage.removeItem('authToken');
    // Clear all cached queries
    queryClient.clear();
    window.location.href = '/login';
  };
}