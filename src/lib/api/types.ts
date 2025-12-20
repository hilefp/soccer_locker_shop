// API Response Types

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// User Types
export interface User {
  age: number | null;
  createdAt: Date | string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  id: string;
  image: string | null;
  lastName: string | null;
  name: string;
  role?: "admin" | "user";
  twoFactorEnabled: boolean | null;
  updatedAt: Date | string;
}

// JWT Payload Type
export interface JWTPayload {
  age?: number | null;
  aud?: string;
  email: string;
  emailVerified?: boolean;
  exp: number;
  firstName?: string | null;
  iat: number;
  iss?: string;
  lastName?: string | null;
  name: string;
  role?: "admin" | "user";
  sub: string; // user ID
}

// Session Types
export interface Session {
  token: string;
  user: User;
}

// Auth Types
export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  age?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  refreshToken: string;
  token: string;
  user: User;
}

// Shop Customer Types
export interface ShopCustomerProfile {
  address: string | null;
  avatarUrl: string | null;
  birthDate: Date | null;
  city: string | null;
  companyName: string | null;
  country: string | null;
  firstName: string | null;
  lastName: string | null;
  newsletter: boolean;
  phone: string | null;
  postalCode: string | null;
  state: string | null;
  taxId: string | null;
}

export interface ShopCustomer {
  email: string;
  id: string;
  profile: ShopCustomerProfile;
}

export interface ShopRegisterRequest {
  address?: string;
  avatarUrl?: string;
  birthDate?: string; // ISO date string
  city?: string;
  companyName?: string;
  country?: string;
  email: string;
  firstName: string;
  lastName: string;
  newsletter?: boolean;
  password: string;
  phone?: string;
  postalCode?: string;
  state?: string;
  taxId?: string;
}

export interface ShopLoginRequest {
  email: string;
  password: string;
}

export interface ShopForgotPasswordRequest {
  email: string;
}

export interface ShopResetPasswordRequest {
  newPassword: string;
  token: string;
}

export interface ShopAuthResponse {
  accessToken: string;
  message: string;
  user: ShopCustomer;
}

export interface ShopPasswordResetResponse {
  message: string;
}

// Payment Types (Polar)
export interface PolarCustomer {
  createdAt: Date | string;
  customerId: string;
  id: string;
  updatedAt: Date | string;
  userId: string;
}

export interface PolarSubscription {
  createdAt: Date | string;
  customerId: string;
  id: string;
  productId: string;
  status: string;
  subscriptionId: string;
  updatedAt: Date | string;
  userId: string;
}

// Upload Types
export type UploadType = "image" | "video";

export interface Upload {
  createdAt: Date | string;
  id: string;
  key: string;
  type: UploadType;
  updatedAt?: Date | string;
  url: string;
  userId: string;
}

export interface CreateUploadRequest {
  key: string;
  type: UploadType;
  url: string;
  userId: string;
}
