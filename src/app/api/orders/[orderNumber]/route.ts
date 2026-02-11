import { NextResponse } from "next/server";

import { getOrderByNumberServer } from "~/lib/api/orders";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_ORDER_NUMBER",
            message: "Order number is required",
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const order = await getOrderByNumberServer(orderNumber);

    if (!order) {
      return NextResponse.json(
        {
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found. Please check your order number and try again.",
          },
          success: false,
        },
        { status: 404 },
      );
    }

    // Return raw order object (errors still use ApiResponse format)
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching the order",
        },
        success: false,
      },
      { status: 500 },
    );
  }
}
