import { apiGetServer } from "~/lib/api/client-server";
import type { Club, ClubProductDetail, ClubProductFilters, ClubProductsResponse } from "~/lib/api/types";

/**
 * Fetch all active clubs from the API (server-side)
 */
export async function getClubs(): Promise<Club[]> {
  try {
    const clubs = await apiGetServer<Club[]>("/api/shop/clubs");
    return clubs.filter((club) => club.isActive);
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }
}

/**
 * Fetch a single club by ID (server-side)
 */
export async function getClubById(id: string): Promise<Club | null> {
  try {
    const club = await apiGetServer<Club>(`/api/shop/clubs/${id}`);
    return club.isActive ? club : null;
  } catch (error) {
    console.error(`Error fetching club ${id}:`, error);
    return null;
  }
}

/**
 * Fetch club products with filters (server-side)
 */
export async function getClubProducts(
  clubId: string,
  filters?: ClubProductFilters
): Promise<ClubProductsResponse> {
  try {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.search) params.append("search", filters.search);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.brandId) params.append("brandId", filters.brandId);
      if (filters.minPrice !== undefined) params.append("minPrice", filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.append("maxPrice", filters.maxPrice.toString());
      if (filters.isActive !== undefined) params.append("isActive", filters.isActive.toString());
      if (filters.inStock !== undefined) params.append("inStock", filters.inStock.toString());
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
      if (filters.tags) params.append("tags", filters.tags);
    }

    const queryString = params.toString();
    const url = `/api/shop/clubs/${clubId}/products${queryString ? `?${queryString}` : ""}`;

    const response = await apiGetServer<ClubProductsResponse>(url);
    return response;
  } catch (error) {
    console.error(`Error fetching products for club ${clubId}:`, error);
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    };
  }
}

/**
 * Fetch a single club product by club ID and product ID (server-side)
 */
export async function getClubProduct(
  clubId: string,
  productId: string
): Promise<ClubProductDetail | null> {
  try {
    const product = await apiGetServer<ClubProductDetail>(
      `/api/shop/clubs/${clubId}/products/${productId}`
    );
    return product;
  } catch (error) {
    console.error(`Error fetching product ${productId} for club ${clubId}:`, error);
    return null;
  }
}
