"use client";

import { ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import type {
  ClubPackageDetail,
  ClubPackageItem,
  CustomFieldDefinition,
  PackageGroupItem,
  PackageItemVariant,
} from "~/lib/api/types";
import { cn } from "~/lib/cn";
import { useCart } from "~/lib/hooks/use-cart";
import { Button } from "~/ui/primitives/button";

// ─── Variant sorting (mirrors ClubProductClient) ──────────────────────────────

const SIZE_ORDER: Record<string, number> = {
  "x-small": 0, xs: 0,
  small: 1, s: 1,
  medium: 2, m: 2,
  large: 3, l: 3,
  "x-large": 4, xl: 4,
  "xx-large": 5, xxl: 5,
};

const GROUP_ORDER: Record<string, number> = {
  youth: 0, kid: 0,
  women: 1,
  adult: 2, men: 2,
};

function getGroupRank(key: string): number {
  const lower = key.toLowerCase();
  for (const [k, rank] of Object.entries(GROUP_ORDER)) {
    if (lower.includes(k)) return rank;
  }
  return 99;
}

function getSizeRank(val: string): number {
  const lower = val.toLowerCase().split("(")[0]!.trim();
  const entries = Object.entries(SIZE_ORDER).sort(([a], [b]) => b.length - a.length);
  for (const [key, rank] of entries) {
    const norm = key.replace("-", " ");
    if (lower === key || lower === norm || lower.endsWith(` ${key}`) || lower.endsWith(` ${norm}`)) {
      return rank;
    }
  }
  return 99;
}

interface VariantOption {
  id: string;
  label: string;
}

/**
 * Returns all selectable variants as a sorted flat list with display labels.
 * - All variants share the same single attribute key → label is just the value ("Small")
 * - Variants have different keys (Youth/Women's/Adult) → label is "Key Value" ("Youth Small")
 * - Variants have multiple attributes → label joins all values ("Black / M")
 */
function getSortedVariantOptions(variants: PackageItemVariant[]): VariantOption[] {
  const withAttrs = variants.filter((v) => Object.keys(v.attributes).length > 0);
  if (withAttrs.length === 0) return [];

  const firstKeys = withAttrs.map((v) => Object.keys(v.attributes)[0]!);
  const uniqueFirstKeys = new Set(firstKeys);
  const sharedSingleKey =
    uniqueFirstKeys.size === 1 && withAttrs.every((v) => Object.keys(v.attributes).length === 1);

  return withAttrs
    .map((v) => {
      const entries = Object.entries(v.attributes);
      let label: string;
      if (entries.length === 1) {
        const [key, val] = entries[0]!;
        if (sharedSingleKey) {
          label = val;
        } else {
          // Only prepend the group key if the value doesn't already include it
          // e.g. key="Youth", val="Youth X-Small" → "Youth X-Small" (not "Youth Youth X-Small")
          label = val.toLowerCase().startsWith(key.toLowerCase()) ? val : `${key} ${val}`;
        }
      } else {
        label = entries.map(([, val]) => val).join(" / ");
      }
      return { id: v.id, label };
    })
    .sort((a, b) => {
      const aVariant = withAttrs.find((v) => v.id === a.id)!;
      const bVariant = withAttrs.find((v) => v.id === b.id)!;
      const aKey = Object.keys(aVariant.attributes)[0] ?? "";
      const bKey = Object.keys(bVariant.attributes)[0] ?? "";
      const groupDiff = getGroupRank(aKey) - getGroupRank(bKey);
      if (groupDiff !== 0) return groupDiff;
      const aVal = Object.values(aVariant.attributes)[0] ?? "";
      const bVal = Object.values(bVariant.attributes)[0] ?? "";
      return getSizeRank(aVal) - getSizeRank(bVal);
    });
}

/** Dropdown header label derived from the attribute key(s) */
function getDropdownLabel(variants: PackageItemVariant[]): string {
  const withAttrs = variants.filter((v) => Object.keys(v.attributes).length > 0);
  const firstKeys = new Set(withAttrs.map((v) => Object.keys(v.attributes)[0]!));
  if (firstKeys.size === 1) return [...firstKeys][0]!;
  return "Size";
}

// ─── Grouped-item helpers ─────────────────────────────────────────────────────

function findGroupItemForVariant(
  item: ClubPackageItem,
  variantId: string,
): PackageGroupItem | null {
  if (!item.isGrouped || !item.groupItems) return null;
  return item.groupItems.find((gi) => gi.variants.some((v) => v.id === variantId)) ?? null;
}

function getCustomFields(
  item: ClubPackageItem,
  selectedVariantId?: string,
): CustomFieldDefinition[] {
  if (item.isGrouped && selectedVariantId) {
    const groupItem = findGroupItemForVariant(item, selectedVariantId);
    return groupItem?.customFields ?? item.customFields ?? [];
  }
  return item.customFields ?? [];
}

// ─── Selection model ──────────────────────────────────────────────────────────

interface ItemSelection {
  selectedVariantId: string | null;
  customFieldValues: Record<string, string>;
}

const EMPTY_SELECTION: ItemSelection = { selectedVariantId: null, customFieldValues: {} };

function isItemComplete(item: ClubPackageItem, selection: ItemSelection): boolean {
  const options = getSortedVariantOptions(item.variants);
  if (options.length > 0 && !selection.selectedVariantId) return false;

  const variantId = options.length > 0
    ? (selection.selectedVariantId ?? undefined)
    : item.variants[0]?.id;

  for (const field of getCustomFields(item, variantId)) {
    const key = field.key ?? field.label;
    if (field.required && !selection.customFieldValues[key]?.trim()) return false;
  }
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PackageClientProps {
  pkg: ClubPackageDetail;
  clubId: string;
  clubSlug: string;
}

export function PackageClient({ pkg, clubId, clubSlug }: PackageClientProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [currentPage, setCurrentPage] = React.useState(0);
  const [itemSelections, setItemSelections] = React.useState<Record<number, ItemSelection>>({});
  const [customFieldErrors, setCustomFieldErrors] = React.useState<Record<string, boolean>>({});
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [isAdding, setIsAdding] = React.useState(false);

  const items = pkg.items;
  const totalPages = items.length;
  const currentItem = items[currentPage]!;
  const currentSelection = itemSelections[currentPage] ?? EMPTY_SELECTION;

  React.useEffect(() => {
    setSelectedImageIndex(0);
  }, [currentPage]);

  const sortedOptions = React.useMemo(
    () => getSortedVariantOptions(currentItem.variants),
    [currentItem],
  );

  const dropdownLabel = React.useMemo(
    () => getDropdownLabel(currentItem.variants),
    [currentItem],
  );

  const selectedVariant = React.useMemo(() => {
    if (sortedOptions.length > 0 && currentSelection.selectedVariantId) {
      return currentItem.variants.find((v) => v.id === currentSelection.selectedVariantId) ?? null;
    }
    if (sortedOptions.length === 0) return currentItem.variants[0] ?? null;
    return null;
  }, [sortedOptions, currentSelection.selectedVariantId, currentItem.variants]);

  const currentCustomFields = React.useMemo(
    () => getCustomFields(currentItem, selectedVariant?.id),
    [currentItem, selectedVariant],
  );

  const isCurrentComplete = React.useMemo(
    () => isItemComplete(currentItem, currentSelection),
    [currentItem, currentSelection],
  );

  const allComplete = React.useMemo(
    () => items.every((item, i) => isItemComplete(item, itemSelections[i] ?? EMPTY_SELECTION)),
    [items, itemSelections],
  );

  // ── Updaters ─────────────────────────────────────────────────────────────────

  const updateSelection = (page: number, updates: Partial<ItemSelection>) => {
    setItemSelections((prev) => ({
      ...prev,
      [page]: { ...(prev[page] ?? EMPTY_SELECTION), ...updates },
    }));
  };

  const handleVariantChange = (variantId: string) => {
    updateSelection(currentPage, { selectedVariantId: variantId || null });
  };

  const handleCustomFieldChange = (fieldKey: string, value: string) => {
    updateSelection(currentPage, {
      customFieldValues: { ...currentSelection.customFieldValues, [fieldKey]: value },
    });
    if (value.trim()) {
      setCustomFieldErrors((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  // ── Navigation ───────────────────────────────────────────────────────────────

  const validateCustomFields = (): boolean => {
    const errors: Record<string, boolean> = {};
    let hasErrors = false;
    for (const field of currentCustomFields) {
      const key = field.key ?? field.label;
      if (field.required && !currentSelection.customFieldValues[key]?.trim()) {
        errors[key] = true;
        hasErrors = true;
      }
    }
    setCustomFieldErrors(errors);
    return !hasErrors;
  };

  const handleNext = () => {
    if (!isCurrentComplete) {
      if (sortedOptions.length > 0 && !currentSelection.selectedVariantId) {
        toast.error(`Please select a ${dropdownLabel.toLowerCase()} to continue`);
        return;
      }
      if (!validateCustomFields()) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    setCustomFieldErrors({});
  };

  const handlePrev = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
    setCustomFieldErrors({});
  };

  // ── Add to Cart ──────────────────────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!allComplete) {
      const firstIncomplete = items.findIndex(
        (item, i) => !isItemComplete(item, itemSelections[i] ?? EMPTY_SELECTION),
      );
      if (firstIncomplete !== -1) {
        setCurrentPage(firstIncomplete);
        toast.error(`Please complete product ${firstIncomplete + 1} first`);
      }
      return;
    }

    setIsAdding(true);

    // Add virtual package header (carries the full price)
    addItem({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      image: pkg.imageUrls[0] ?? items[0]?.imageUrls[0] ?? "",
      category: "Package",
      clubId,
      isPackageHeader: true,
    }, 1);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const sel = itemSelections[i] ?? EMPTY_SELECTION;
      const opts = getSortedVariantOptions(item.variants);

      const variant =
        opts.length > 0
          ? item.variants.find((v) => v.id === sel.selectedVariantId) ?? null
          : (item.variants[0] ?? null);

      const sizeLabel = opts.find((o) => o.id === sel.selectedVariantId)?.label ?? variant?.sku ?? "";
      const cartName = sizeLabel ? `${item.name} - ${sizeLabel}` : item.name;

      let effectiveClubProductId = item.clubProductId;
      if (item.isGrouped && variant) {
        const groupItem = findGroupItemForVariant(item, variant.id);
        if (groupItem) effectiveClubProductId = groupItem.clubProductId;
      }

      const customFields = getCustomFields(item, variant?.id);
      const customFieldsData =
        customFields.length > 0
          ? Object.fromEntries(
              customFields
                .filter((f) => sel.customFieldValues[f.key ?? f.label]?.trim())
                .map((f) => [f.label, sel.customFieldValues[f.key ?? f.label]]),
            )
          : undefined;

      addItem(
        {
          id: `${pkg.id}-${effectiveClubProductId}-${variant?.id ?? i}`,
          name: cartName,
          price: 0, // Price is carried by the package header
          image: item.imageUrls[0] ?? "",
          category: item.product.category.name,
          clubId,
          clubProductId: effectiveClubProductId,
          variantId: variant?.id,
          customFields: customFieldsData,
          packageId: pkg.id,
          packageName: pkg.name,
        },
        item.quantity,
      );
    }

    toast.success(`${pkg.name} added to cart`);
    await new Promise((r) => setTimeout(r, 400));
    setIsAdding(false);
    router.push(`/clubs/${clubSlug}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const { brand } = currentItem.product;
  const currentImages = currentItem.imageUrls;
  const itemComplete = (i: number) =>
    isItemComplete(items[i]!, itemSelections[i] ?? EMPTY_SELECTION);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* ── Left: Image Gallery ── */}
      <div className="flex gap-4">
        {currentImages.length > 1 && (
          <div className="flex flex-col gap-2">
            {currentImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={cn(
                  "relative h-20 w-20 overflow-hidden rounded-lg border-2 bg-muted transition-all",
                  selectedImageIndex === idx
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/50",
                )}
              >
                <Image
                  alt={`${currentItem.name} ${idx + 1}`}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={img}
                />
              </button>
            ))}
          </div>
        )}

        <div className="relative aspect-square flex-1 overflow-hidden rounded-lg bg-muted">
          {currentImages[selectedImageIndex] ? (
            <Image
              alt={currentItem.name}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              src={currentImages[selectedImageIndex]}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">No Image</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Info + Controls ── */}
      <div className="flex flex-col">
        {/* Brand + Price */}
        <div className="flex items-center justify-between">
          {brand.imageUrl ? (
            <div className="relative h-12 w-24">
              <Image
                alt={brand.name}
                className="object-contain object-left"
                fill
                sizes="96px"
                src={brand.imageUrl}
              />
            </div>
          ) : (
            <span className="font-semibold">{brand.name}</span>
          )}
          <p className="text-lg font-bold">Price: ${pkg.price.toFixed(2)}</p>
        </div>

        {/* Product Name */}
        <h1 className="mt-4 text-xl font-bold text-primary">{currentItem.name}</h1>

        {/* Size / Variant Dropdown */}
        {sortedOptions.length > 0 && (
          <div className="mt-6">
            <label className="text-sm font-bold uppercase tracking-wide">
              {dropdownLabel}:
            </label>
            <select
              value={currentSelection.selectedVariantId ?? ""}
              onChange={(e) => handleVariantChange(e.target.value)}
              className={cn(
                "mt-2 w-full rounded-md border bg-background px-3 py-2.5 text-sm",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                "border-border",
              )}
            >
              <option value="">Select {dropdownLabel}</option>
              {sortedOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stock Availability */}
        {selectedVariant?.availability && (
          <p
            className={cn("text-xs font-medium mt-1", {
              "text-green-600": selectedVariant.availability.status === "IN_STOCK",
              "text-amber-600": selectedVariant.availability.status === "LOW_STOCK",
              "text-destructive": selectedVariant.availability.status === "OUT_OF_STOCK",
            })}
          >
            {selectedVariant.availability.status === "IN_STOCK" && "In Stock"}
            {selectedVariant.availability.status === "LOW_STOCK" && "Low Stock — Only a few left"}
            {selectedVariant.availability.status === "OUT_OF_STOCK" && "Backordered"}
          </p>
        )}

        {/* Custom Fields */}
        {currentCustomFields.length > 0 && (
          <div className="mt-6 space-y-4">
            {currentCustomFields.map((field) => {
              const fieldKey = field.key ?? field.label;
              return (
                <div key={fieldKey}>
                  <label
                    htmlFor={`cf-${fieldKey}`}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    {field.label}
                    {field.required && <span className="ml-0.5 text-destructive">*</span>}
                  </label>

                  {field.type === "select" && field.options ? (
                    <select
                      id={`cf-${fieldKey}`}
                      value={currentSelection.customFieldValues[fieldKey] ?? ""}
                      onChange={(e) => handleCustomFieldChange(fieldKey, e.target.value)}
                      className={cn(
                        "mt-1.5 w-full rounded-md border bg-background px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                        customFieldErrors[fieldKey] ? "border-destructive" : "border-border",
                      )}
                    >
                      <option value="">
                        {field.placeholder || `Select ${field.label.toLowerCase()}`}
                      </option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`cf-${fieldKey}`}
                      type={
                        field.type === "number" || field.type === "date" ? "text" : field.type
                      }
                      inputMode={
                        field.type === "number" || field.type === "date" ? "numeric" : undefined
                      }
                      maxLength={field.type === "date" ? 4 : undefined}
                      placeholder={
                        field.placeholder ||
                        (field.type === "date"
                          ? "e.g. 2015"
                          : `Enter ${field.label.toLowerCase()}`)
                      }
                      value={currentSelection.customFieldValues[fieldKey] ?? ""}
                      onChange={(e) => {
                        const val =
                          field.type === "date"
                            ? e.target.value.replace(/\D/g, "").slice(0, 4)
                            : e.target.value;
                        handleCustomFieldChange(fieldKey, val);
                      }}
                      className={cn(
                        "mt-1.5 w-full rounded-md border bg-background px-3 py-2.5 text-sm",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                        customFieldErrors[fieldKey] ? "border-destructive" : "border-border",
                      )}
                    />
                  )}
                  {customFieldErrors[fieldKey] && (
                    <p className="mt-1 text-xs text-destructive">{field.label} is required</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PREV / NEXT */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Button
            disabled={currentPage === 0}
            onClick={handlePrev}
            size="lg"
            variant="secondary"
            className="w-full font-bold uppercase"
          >
            Prev
          </Button>

          {currentPage < totalPages - 1 ? (
            <Button onClick={handleNext} size="lg" className="w-full font-bold uppercase">
              Next
            </Button>
          ) : (
            <Button
              disabled={!allComplete || isAdding}
              onClick={handleAddToCart}
              size="lg"
              className="w-full font-bold uppercase"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {isAdding ? "Adding..." : "Add to Cart"}
            </Button>
          )}
        </div>

        {/* Page Dots */}
        <div className="mt-4 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentPage(i); setCustomFieldErrors({}); }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-all",
                currentPage === i
                  ? "bg-primary text-primary-foreground"
                  : itemComplete(i)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Hint */}
        {!isCurrentComplete && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {sortedOptions.length > 0 && !currentSelection.selectedVariantId
              ? `Please select a ${dropdownLabel.toLowerCase()} to continue`
              : "Please fill in all required fields to continue"}
          </p>
        )}
      </div>
    </div>
  );
}
