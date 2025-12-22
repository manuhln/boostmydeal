/**
 * User Data Transfer Objects
 * Define the structure of data transferred between layers
 */

export interface CreateUserDto {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'owner' | 'admin' | 'manager' | 'agent';
  permissions?: string[];
  profileImage?: string;
  phone?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: 'owner' | 'admin' | 'manager' | 'agent';
  permissions?: string[];
  profileImage?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  phone?: string;
}

export interface UserResponseDto {
  _id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'manager' | 'agent';
  permissions: string[];
  profileImage?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithOrganizationDto {
  user: UserResponseDto;
  organization: {
    _id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    website?: string;
    logo?: string;
    plan: 'starter' | 'professional' | 'enterprise';
    settings: {
      timezone: string;
      currency: string;
      dateFormat: string;
      language: string;
    };
  };
}