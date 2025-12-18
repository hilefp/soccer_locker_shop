import type { Upload, User } from "~/lib/api/types";

// The shape of the data expected by the table
// Includes user details and their uploads
export type UserWithUploads = User & {
  uploads: Upload[];
};
