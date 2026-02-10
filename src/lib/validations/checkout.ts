import { z } from "zod";

const addressFields = {
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  company: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  address1: z.string().min(5, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().min(3, "Postal code is required"),
};

const optionalAddressFields = {
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
};

export const checkoutSchema = z
  .object({
    billing: z.object(addressFields),
    shipToDifferentAddress: z.boolean(),
    shipping: z.object(optionalAddressFields).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.shipToDifferentAddress) {
      const s = data.shipping;
      if (!s?.firstName || s.firstName.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "First name must be at least 2 characters",
          path: ["shipping", "firstName"],
        });
      }
      if (!s?.lastName || s.lastName.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Last name must be at least 2 characters",
          path: ["shipping", "lastName"],
        });
      }
      if (!s?.country || s.country.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Country is required",
          path: ["shipping", "country"],
        });
      }
      if (!s?.address1 || s.address1.length < 5) {
        ctx.addIssue({
          code: "custom",
          message: "Address is required",
          path: ["shipping", "address1"],
        });
      }
      if (!s?.city || s.city.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "City is required",
          path: ["shipping", "city"],
        });
      }
      if (!s?.state || s.state.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "State is required",
          path: ["shipping", "state"],
        });
      }
      if (!s?.postalCode || s.postalCode.length < 3) {
        ctx.addIssue({
          code: "custom",
          message: "Postal code is required",
          path: ["shipping", "postalCode"],
        });
      }
    }
  });

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
