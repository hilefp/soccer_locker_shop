"use client";

import * as React from "react";

import type { PaymentConfigResponse } from "~/lib/api/types";

import { apiGet } from "~/lib/api/client";

/* -------------------------------------------------------------------------- */
/*                        Square Web Payments SDK types                       */
/* -------------------------------------------------------------------------- */

export interface SquareBillingContact {
  addressLines?: string[];
  city?: string;
  countryCode?: string;
  email?: string;
  familyName?: string;
  givenName?: string;
  postalCode?: string;
  state?: string;
}

export interface SquareTokenizeError {
  detail?: string;
  field?: string;
  message?: string;
  type?: string;
}

export interface SquareTokenResult {
  errors?: SquareTokenizeError[];
  status: "OK" | string;
  token?: string;
}

type SquareCardEventType =
  | "cardBrandChanged"
  | "errorClassAdded"
  | "errorClassRemoved"
  | "focusClassAdded"
  | "focusClassRemoved"
  | "postalCodeChanged";

interface SquareCardEvent {
  detail?: {
    cardBrand?: string;
  };
}

interface SquareCard {
  addEventListener(
    eventType: SquareCardEventType,
    callback: (event: SquareCardEvent) => void,
  ): void;
  attach(selector: string): Promise<void>;
  destroy(): Promise<void>;
  removeEventListener(
    eventType: SquareCardEventType,
    callback: (event: SquareCardEvent) => void,
  ): void;
  tokenize(): Promise<SquareTokenResult>;
}

interface SquarePayments {
  card(): Promise<SquareCard>;
  verifyBuyer(
    sourceToken: string,
    details: SquareVerifyBuyerDetails,
  ): Promise<null | SquareVerifyBuyerResult>;
}

interface SquareVerifyBuyerDetails {
  amount: string;
  billingContact: SquareBillingContact;
  currencyCode: string;
  intent: "CHARGE";
}

interface SquareVerifyBuyerResult {
  token: string;
}

declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): SquarePayments;
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                             SDK script loading                             */
/* -------------------------------------------------------------------------- */

const SDK_URLS: Record<PaymentConfigResponse["environment"], string> = {
  production: "https://web.squarecdn.com/v1/square.js",
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
};

export type SquarePaymentsStatus = "error" | "idle" | "loading" | "ready";

/* -------------------------------------------------------------------------- */
/*                                    Hook                                    */
/* -------------------------------------------------------------------------- */

interface UseSquarePaymentsOptions {
  /** DOM id of the element the card iframe attaches to. */
  containerId?: string;
  /** Mounts the card element only while true; tears it down when false. */
  enabled: boolean;
}

/**
 * Loads the Square Web Payments SDK (sandbox or production, per the backend's
 * payment-config), mounts the card element into `#<containerId>`, and exposes
 * tokenize/verifyBuyer. Card data lives entirely inside Square's iframe.
 */
export function useSquarePayments({
  containerId = "card-container",
  enabled,
}: UseSquarePaymentsOptions) {
  const [status, setStatus] = React.useState<SquarePaymentsStatus>("idle");
  // True once the card number is recognized (a brand was detected) — the
  // closest signal the SDK gives that the buyer actually entered a card
  const [cardEntered, setCardEntered] = React.useState(false);
  const [cardHasError, setCardHasError] = React.useState(false);
  const paymentsRef = React.useRef<null | SquarePayments>(null);
  const cardRef = React.useRef<null | SquareCard>(null);
  const detachListenersRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const handleBrandChanged = (event: SquareCardEvent) => {
      const brand = event.detail?.cardBrand;
      setCardEntered(!!brand && brand !== "unknown");
    };
    const handleErrorAdded = () => setCardHasError(true);
    const handleErrorRemoved = () => setCardHasError(false);

    async function init() {
      setStatus("loading");
      try {
        const config = await apiGet<PaymentConfigResponse>(
          "/api/shop/checkout/payment-config",
        );
        await loadSquareSdk(config.environment);
        if (cancelled) return;
        if (!window.Square) {
          throw new Error("Square SDK not available after script load");
        }

        const payments = window.Square.payments(
          config.applicationId,
          config.locationId,
        );
        const card = await payments.card();
        if (cancelled) {
          void card.destroy();
          return;
        }
        await card.attach(`#${containerId}`);
        if (cancelled) {
          void card.destroy();
          return;
        }

        // Removed in the effect cleanup via detachListenersRef (the rule can't
        // trace the indirection); card.destroy() also tears the iframe down
        /* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
        card.addEventListener("cardBrandChanged", handleBrandChanged);
        card.addEventListener("errorClassAdded", handleErrorAdded);
        card.addEventListener("errorClassRemoved", handleErrorRemoved);
        /* eslint-enable @eslint-react/web-api/no-leaked-event-listener */
        detachListenersRef.current = () => {
          card.removeEventListener("cardBrandChanged", handleBrandChanged);
          card.removeEventListener("errorClassAdded", handleErrorAdded);
          card.removeEventListener("errorClassRemoved", handleErrorRemoved);
        };

        paymentsRef.current = payments;
        cardRef.current = card;
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Square payments init error:", err);
        setStatus("error");
      }
    }

    void init();

    return () => {
      cancelled = true;
      detachListenersRef.current?.();
      detachListenersRef.current = null;
      if (cardRef.current) {
        void cardRef.current.destroy();
        cardRef.current = null;
      }
      paymentsRef.current = null;
      setStatus("idle");
      setCardEntered(false);
      setCardHasError(false);
    };
  }, [enabled, containerId]);

  /** Tokenizes the card currently entered in the iframe. Tokens are single-use. */
  const tokenize = React.useCallback(async (): Promise<SquareTokenResult> => {
    if (!cardRef.current) {
      return { errors: [{ message: "Payment form is not ready yet." }], status: "ERROR" };
    }
    return cardRef.current.tokenize();
  }, []);

  /** Runs SCA/3DS buyer verification; returns the verification token (or null). */
  const verifyBuyer = React.useCallback(
    async (
      sourceToken: string,
      amount: string,
      billingContact: SquareBillingContact,
    ): Promise<string | undefined> => {
      if (!paymentsRef.current) return undefined;
      const result = await paymentsRef.current.verifyBuyer(sourceToken, {
        amount,
        billingContact,
        currencyCode: "USD",
        intent: "CHARGE",
      });
      return result?.token;
    },
    [],
  );

  return { cardEntered, cardHasError, status, tokenize, verifyBuyer };
}

function loadSquareSdk(
  environment: PaymentConfigResponse["environment"],
): Promise<void> {
  if (window.Square) return Promise.resolve();

  const src = SDK_URLS[environment];
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    const script = existing ?? document.createElement("script");

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load the Square payments SDK")),
      { once: true },
    );

    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}
