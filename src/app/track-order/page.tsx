"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { OrderTimeline } from "~/ui/components/order-timeline";
import { getOrderTimeline, getEstimatedDelivery } from "~/lib/utils/order-timeline";
import type { Order, ApiResponse } from "~/lib/api/types";

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState("");
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchOrder = useCallback(async (number: string) => {
    setError("");
    setIsSearching(true);

    try {
      const response = await fetch(`/api/orders/${number.toUpperCase()}`);

      if (!response.ok) {
        const errorData = await response.json() as ApiResponse<Order>;
        setOrderData(null);
        setError(
          errorData.error?.message || "Order not found. Please check your order number and try again."
        );
        return;
      }

      const data = await response.json() as Order;
      setOrderData(data);
      setError("");
    } catch (err) {
      setOrderData(null);
      setError("An error occurred while fetching the order. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-search when orderNumber is provided via query param
  useEffect(() => {
    const paramOrderNumber = searchParams.get("orderNumber");
    if (paramOrderNumber) {
      setOrderNumber(paramOrderNumber);
      void fetchOrder(paramOrderNumber);
    }
  }, [searchParams, fetchOrder]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchOrder(orderNumber);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          Track Your Order
        </h1>
        <p className="text-muted-foreground">
          Enter your order number to see the latest updates
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Number</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSearch}>
            <div className="space-y-2">
              <Label htmlFor="orderNumber">
                Enter your order number (e.g., ORD-2024-001, ORD-2024-002, ORD-2024-003)
              </Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  id="orderNumber"
                  placeholder="ORD-2024-003"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
                <Button disabled={isSearching} type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  {isSearching ? "Searching..." : "Track"}
                </Button>
              </div>
            </div>
          </form>

          {error && (
            <div
              className={`
                mt-4 rounded-lg border border-destructive/50 bg-destructive/10
                p-4 text-sm text-destructive
              `}
            >
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {orderData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order {orderData.orderNumber}</CardTitle>
                <span
                  className={`
                    rounded-full px-3 py-1 text-sm font-medium capitalize
                    ${
                      orderData.status === "DELIVERED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : orderData.status === "SHIPPED" || orderData.status === "IN_TRANSIT"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }
                  `}
                >
                  {orderData.status?.replace(/_/g, ' ').toLowerCase() || 'Unknown'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Order Items */}
                {orderData.items && orderData.items.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Order Items:</h3>
                    <ul className="space-y-1">
                      {orderData.items.map((item) => (
                        <li className="text-muted-foreground" key={item.id}>
                          {item.name} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Estimated Delivery */}
                {orderData.status !== "DELIVERED" && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Estimated Delivery:{" "}
                      <span className="font-medium text-foreground">
                        {getEstimatedDelivery(orderData)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Progress Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline timeline={getOrderTimeline(orderData)} />
            </CardContent>
          </Card>
        </div>
      )}

      {!orderData && !error && (
        <div className="py-12 text-center text-muted-foreground">
          <p>Enter your order number above to track your shipment</p>
        </div>
      )}
    </div>
  );
}
