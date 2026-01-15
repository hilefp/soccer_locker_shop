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

// Club Types
export interface Club {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  iconBrandShopUrl: string | null;
  descriptionShop: string | null;
  personInCharge: string | null;
  personInChargeEmail: string | null;
  personInChargePhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBrand {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  imageUrl: string | null;
  websiteUrl: string | null;
  code: string;
  isActive: boolean;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  model: string | null;
  categoryId: string;
  brandId: string;
  imageUrl: string | null;
  tags: string[];
  imageUrls: string[];
  isActive: boolean;
  isFeatured: boolean;
  minPrice: string | null;
  maxPrice: string | null;
  createdAt: string;
  updatedAt: string;
  category: ProductCategory;
  brand: ProductBrand;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  attributes: Record<string, string>;
  isDefault: boolean;
  price: string;
  compareAtPrice: string | null;
  cost: string | null;
  weight: string | null;
  weightUnit: string | null;
  dimensions: string | null;
  dimensionUnit: string | null;
  imageUrl: string | null;
  isActive: boolean;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface ClubProduct {
  id: string;
  clubId: string;
  productId: string;
  name: string | null;
  price: string;
  description: string | null;
  imageUrls: string[];
  brandLogoUrl: string | null;
  isActive: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
}

export interface ClubProductDetail {
  id: string;
  clubId: string;
  productId: string;
  name: string | null;
  price: string;
  description: string | null;
  imageUrls: string[];
  brandLogoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: ProductWithVariants;
}

export interface ClubProductsResponse {
  data: ClubProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export enum SortBy {
  NAME = "name",
  PRICE = "price",
  CREATED_AT = "createdAt",
  STOCK = "stock",
}

export interface ClubProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  inStock?: boolean;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  tags?: string;
}
