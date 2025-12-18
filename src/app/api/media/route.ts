import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

import { getCurrentUser } from "~/lib/auth";
import {
  deleteUpload,
  getUploadsByUserId,
} from "~/lib/api/uploads";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as { id: string };
    if (!body.id) {
      return new NextResponse("Missing media ID", { status: 400 });
    }

    // Get the media items from external API to check ownership
    const userMedia = await getUploadsByUserId(user.id);
    const mediaItem = userMedia.find((item) => item.id === body.id);

    if (!mediaItem) {
      return new NextResponse("Media not found", { status: 404 });
    }

    if (mediaItem.userId !== user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Delete from UploadThing
    const utapi = new UTApi();
    await utapi.deleteFiles(mediaItem.key);

    // Delete from external API
    await deleteUpload(body.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting media:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all media types for the user from external API
    const userMedia = await getUploadsByUserId(user.id);

    return NextResponse.json(userMedia);
  } catch (error) {
    console.error("Error fetching user media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
