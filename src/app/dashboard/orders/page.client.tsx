"use client";

import { ChevronLeft, ChevronRight, Eye, Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { apiGet } from "~/lib/api/client";
import type { Order, OrderItem } from "~/lib/api/types";
import { useCurrentUserOrRedirect } from "~/lib/auth-client";
import { SidebarAccount } from "~/ui/components/sidebar-account";
import { Badge } from "~/ui/primitives/badge";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/primitives/table";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "DELIVERED":
      return "default";
    case "MISSING":
    case "REFUND":
      return "destructive";
    case "SHIPPING":
    case "PROCESSING":
      return "secondary";
    default:
      return "outline";
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: string, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount));
}

const PAGE_SIZE = 10;

export function OrdersPageClient() {
  const { loading: authLoading } = useCurrentUserOrRedirect();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (authLoading) return;

    apiGet<{ data: Order[] }>("/api/shop/account/orders")
      .then((res) => {
        setOrders(res.data || []);
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [authLoading]);

  const handleViewOrder = useCallback(async (orderNumber: string) => {
    setDetailLoading(true);
    setDialogOpen(true);
    try {
      const data = await apiGet<Order>(
        `/api/shop/account/orders/${orderNumber}`
      );
      setSelectedOrder(data || null);
    } catch {
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        max-w-7xl mx-auto grid flex-1 items-start gap-4 p-4
        md:grid-cols-2 md:gap-8
        lg:grid-cols-3
      `}
    >
      <div
        className={`
          grid gap-4
          md:col-span-2
          lg:col-span-1
        `}
      >
        <SidebarAccount />
      </div>
      <div
        className={`
          grid gap-4 space-y-6
          md:col-span-2
          lg:col-span-2
        `}
      >
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            View your order history and track deliveries.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No orders found.
              </div>
            ) : (
              (() => {
                const totalPages = Math.ceil(orders.length / PAGE_SIZE);
                const paginated = orders.slice(
                  (currentPage - 1) * PAGE_SIZE,
                  currentPage * PAGE_SIZE
                );
                return (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-15" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginated.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell>{formatDate(order.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(order.status)}>
                                  {order.status.replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(order.total, order.currency)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  onClick={() => handleViewOrder(order.orderNumber)}
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                            size="icon"
                            variant="outline"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                            size="icon"
                            variant="outline"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder?.orderNumber || ""}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading order details...
            </div>
          ) : selectedOrder ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedOrder.createdAt)}
                </span>
                <Badge variant={getStatusVariant(selectedOrder.status)}>
                  {selectedOrder.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="space-y-3">
                {(() => {
                  const items = selectedOrder.items ?? [];
                  const standaloneItems = items.filter((i) => !i.packageInstanceId);

                  // Group package items by packageInstanceId
                  const packageGroups = new Map<string, OrderItem[]>();
                  for (const item of items) {
                    if (!item.packageInstanceId) continue;
                    const group = packageGroups.get(item.packageInstanceId) ?? [];
                    group.push(item);
                    packageGroups.set(item.packageInstanceId, group);
                  }

                  const renderSubItem = (item: OrderItem) => {
                    const sizeValue = item.attributes
                      ? Object.values(item.attributes)[0]
                      : null;
                    return (
                      <div key={item.id} className="pl-3 border-l-2 border-muted space-y-0.5">
                        <p className="text-sm leading-tight">
                          {item.clubProduct?.name || item.name}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>SKU: {item.sku}</span>
                          {sizeValue && <span>{sizeValue}</span>}
                        </div>
                        {item.customFields &&
                          typeof item.customFields === "object" &&
                          Object.keys(item.customFields).length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-primary">
                              {Object.entries(item.customFields).map(
                                ([key, value]) =>
                                  value ? (
                                    <span key={key}>
                                      {key}: {value}
                                    </span>
                                  ) : null,
                              )}
                            </div>
                          )}
                        <span className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    );
                  };

                  const renderStandaloneItem = (item: OrderItem) => {
                    const sizeValue = item.attributes
                      ? Object.values(item.attributes)[0]
                      : null;
                    return (
                      <div
                        className="rounded-md border p-3 space-y-1"
                        key={item.id}
                      >
                        <p className="font-medium text-sm leading-tight">
                          {item.clubProduct?.name || item.name}
                        </p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>SKU: {item.sku}</span>
                          {sizeValue && <span>{sizeValue}</span>}
                        </div>
                        {item.customFields &&
                          typeof item.customFields === "object" &&
                          Object.keys(item.customFields).length > 0 && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-primary">
                              {Object.entries(item.customFields).map(
                                ([key, value]) =>
                                  value ? (
                                    <span key={key}>
                                      {key}: {value}
                                    </span>
                                  ) : null,
                              )}
                            </div>
                          )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {Array.from(packageGroups.entries()).map(([instanceId, groupItems]) => {
                        const first = groupItems[0]!;
                        const packagePrice = first.packagePrice ?? first.totalPrice;
                        return (
                          <div key={instanceId} className="rounded-md border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm">{first.packageName || "Package"}</p>
                              <span className="font-medium text-sm">
                                {formatCurrency(packagePrice)}
                              </span>
                            </div>
                            <div className="space-y-2 pt-1">
                              {groupItems.map(renderSubItem)}
                            </div>
                          </div>
                        );
                      })}
                      {standaloneItems.map(renderStandaloneItem)}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatCurrency(
                      selectedOrder.subtotal,
                      selectedOrder.currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    {formatCurrency(
                      selectedOrder.taxTotal,
                      selectedOrder.currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {formatCurrency(
                      selectedOrder.shippingTotal,
                      selectedOrder.currency
                    )}
                  </span>
                </div>
                {selectedOrder.isRushOrder &&
                  Number(selectedOrder.rushFee) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rush Fee</span>
                      <span>
                        {formatCurrency(
                          String(selectedOrder.rushFee),
                          selectedOrder.currency
                        )}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      selectedOrder.total,
                      selectedOrder.currency
                    )}
                  </span>
                </div>
              </div>

              {selectedOrder.trackingNumber && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Tracking: </span>
                  <span className="font-mono">
                    {selectedOrder.trackingNumber}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Failed to load order details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
