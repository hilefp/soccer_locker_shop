// Uploads API client

import {
  apiDeleteServer,
  apiGetServer,
  apiPostServer,
} from "~/lib/api/client-server";
import type { CreateUploadRequest, Upload } from "~/lib/api/types";

/**
 * Get uploads for a user
 */
export async function getUploadsByUserId(
  userId: string,
): Promise<Upload[]> {
  try {
    const uploads = await apiGetServer<Upload[]>(`/uploads?userId=${userId}`);
    return uploads;
  } catch (error) {
    console.error(
      `Failed to fetch uploads for user ${userId}:`,
      error,
    );
    return [];
  }
}

/**
 * Create upload metadata
 */
export async function createUpload(
  data: CreateUploadRequest,
): Promise<Upload> {
  return apiPostServer<Upload>("/uploads", data);
}

/**
 * Delete upload by ID
 */
export async function deleteUpload(uploadId: string): Promise<void> {
  await apiDeleteServer(`/uploads/${uploadId}`);
}
