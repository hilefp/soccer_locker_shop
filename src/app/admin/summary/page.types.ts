import type { Upload, User } from "~/lib/api/types";

export interface UserWithUploads extends User {
  uploads: Upload[];
}
