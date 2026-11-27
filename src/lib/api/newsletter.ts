import { apiPost } from "~/lib/api/client";

/** Turns off marketing emails using the signed link from a campaign email. */
export async function unsubscribeFromNewsletter(
  userId: string,
  token: string,
): Promise<{ message: string }> {
  const params = new URLSearchParams({ t: token, u: userId });
  return apiPost<{ message: string }>(
    `/api/shop/newsletter/unsubscribe?${params.toString()}`,
  );
}
