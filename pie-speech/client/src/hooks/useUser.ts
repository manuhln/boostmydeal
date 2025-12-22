import { useQuery } from "@tanstack/react-query";

// Define the API response types
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  username: string;
  role: string;
  profileImageUrl?: string;
}

interface Organization {
  _id: string;
  name: string;
  email: string;
  plan: string;
  website?: string;
  _doc?: Organization; // MongoDB document structure
}

interface UserWithOrganizationResponse {
  success: boolean;
  data: {
    user: User;
    organization: Organization;
  };
  message: string;
}

export function useUserWithOrganization() {
  return useQuery<UserWithOrganizationResponse>({
    queryKey: ["/api/users/me"],
    retry: false,
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: ["/api/users/profile"],
    retry: false,
  });
}