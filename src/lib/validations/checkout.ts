import { z } from "zod";

export const checkoutSchema = z.object({
  shipping: z.object({
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
  }),
  notes: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
