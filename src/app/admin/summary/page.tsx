import type { UserWithUploads } from "./page.types";
import AdminPageClient from "./page.client";

// TODO: Replace with actual API call to fetch all users
// This is a placeholder - you'll need to implement a /users endpoint in your external API
async function getUsersWithUploads(): Promise<UserWithUploads[]> {
  // For now, return empty array
  // You'll need to implement this based on your external API
  // Example:
  // const users = await apiGet<User[]>("/users");
  // const usersWithUploads = await Promise.all(
  //   users.map(async (user) => {
  //     const uploads = await getUploadsByUserId(user.id);
  //     return { ...user, uploads };
  //   })
  // );
  // return usersWithUploads;

  console.warn("getUsersWithUploads: Not implemented - requires /users endpoint in external API");
  return [];
}

export default async function AdminPage() {
  const data = await getUsersWithUploads();
  return <AdminPageClient initialData={data} />;
}
