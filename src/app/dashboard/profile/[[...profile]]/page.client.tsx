"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiGet, apiPatch } from "~/lib/api/client";
import type { ShopCustomerProfile } from "~/lib/api/types";
import { useCurrentUserOrRedirect } from "~/lib/auth-client";
import {
  type AddressFormData,
  type ProfileFormData,
  addressSchema,
  profileSchema,
} from "~/lib/validations/account";
import { SidebarAccount } from "~/ui/components/sidebar-account";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/primitives/tabs";

export function ProfilePageClient() {
  const { loading: authLoading, user } = useCurrentUserOrRedirect();
  const [profileLoading, setProfileLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    apiGet<{ customerProfile: ShopCustomerProfile }>("/api/shop/account/profile")
      .then((data) => {
        const p = data.customerProfile;
        profileForm.reset({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
        });
        addressForm.reset({
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          postalCode: p.postalCode || "",
          country: p.country || "",
        });
      })
      .catch(() => {
        // Fall back to user data from auth
        profileForm.reset({
          firstName: user.profile?.firstName || "",
          lastName: user.profile?.lastName || "",
        });
        addressForm.reset({
          address: user.profile?.address || "",
          city: user.profile?.city || "",
          state: user.profile?.state || "",
          postalCode: user.profile?.postalCode || "",
          country: user.profile?.country || "",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  const onSaveProfile = async (data: ProfileFormData) => {
    setProfileLoading(true);
    try {
      await apiPatch("/api/shop/account/profile", data);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const onSaveAddress = async (data: AddressFormData) => {
    setAddressLoading(true);
    try {
      await apiPatch("/api/shop/account/profile", data);
      toast.success("Address updated successfully");
    } catch {
      toast.error("Failed to update address");
    } finally {
      setAddressLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">
            Manage your profile information and address.
          </p>
        </div>

        <Tabs className="space-y-4" defaultValue="general">
          <TabsList>
            <TabsTrigger className="flex items-center gap-2" value="general">
              <User className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="address">
              <MapPin className="h-4 w-4" />
              Address
            </TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-4" value="general">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={profileForm.handleSubmit(onSaveProfile)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        {...profileForm.register("firstName")}
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        {...profileForm.register("lastName")}
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      defaultValue={user?.email || ""}
                      disabled
                      id="email"
                      type="email"
                    />
                    <p className="text-sm text-muted-foreground">
                      Contact support to change your email address.
                    </p>
                  </div>
                  <Button disabled={profileLoading} type="submit">
                    {profileLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-4" value="address">
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={addressForm.handleSubmit(onSaveAddress)}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter your street address"
                      {...addressForm.register("address")}
                    />
                    {addressForm.formState.errors.address && (
                      <p className="text-sm text-destructive">
                        {addressForm.formState.errors.address.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Enter your city"
                        {...addressForm.register("city")}
                      />
                      {addressForm.formState.errors.city && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.city.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="Enter your state"
                        {...addressForm.register("state")}
                      />
                      {addressForm.formState.errors.state && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.state.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        placeholder="Enter your country"
                        {...addressForm.register("country")}
                      />
                      {addressForm.formState.errors.country && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.country.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        placeholder="Enter your postal code"
                        {...addressForm.register("postalCode")}
                      />
                      {addressForm.formState.errors.postalCode && (
                        <p className="text-sm text-destructive">
                          {addressForm.formState.errors.postalCode.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button disabled={addressLoading} type="submit">
                    {addressLoading ? "Saving..." : "Save Address"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
