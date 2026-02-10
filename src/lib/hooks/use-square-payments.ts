"use client";

import * as React from "react";

/* -------------------------------------------------------------------------- */
/*                             Square SDK Types                               */
/* -------------------------------------------------------------------------- */

interface SquarePayments {
  card: (options?: Record<string, unknown>) => Promise<SquareCard>;
}

interface SquareCard {
  attach: (selector: string | HTMLElement) => Promise<void>;
  destroy: () => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
}

interface SquareTokenResult {
  errors?: Array<{ message: string }>;
  status: "ERROR" | "OK";
  token?: string;
}

interface UseSquarePaymentsReturn {
  cardRef: React.RefObject<HTMLDivElement | null>;
  error: string | null;
  isReady: boolean;
  tokenize: () => Promise<string>;
}

/* -------------------------------------------------------------------------- */
/*                              Configuration                                 */
/* -------------------------------------------------------------------------- */

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? "";
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

/* -------------------------------------------------------------------------- */
/*                           Script loader helper                             */
/* -------------------------------------------------------------------------- */

function loadSquareScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("square-web-payments-sdk")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "square-web-payments-sdk";
    script.src =
      process.env.NODE_ENV === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Square SDK"));
    document.head.appendChild(script);
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Hook                                     */
/* -------------------------------------------------------------------------- */

export function useSquarePayments(): UseSquarePaymentsReturn {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const cardInstanceRef = React.useRef<SquareCard | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID) {
      setError(
        "Square payment credentials are not configured. Please set NEXT_PUBLIC_SQUARE_APP_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID.",
      );
      return;
    }

    let cancelled = false;

    async function initializeCard() {
      try {
        if (!window.Square) {
          await loadSquareScript();
        }

        const payments = window.Square.payments(
          SQUARE_APP_ID,
          SQUARE_LOCATION_ID,
        );
        const card = await payments.card();

        if (cancelled) {
          await card.destroy();
          return;
        }

        if (cardRef.current) {
          await card.attach(cardRef.current);
          cardInstanceRef.current = card;
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load payment form",
          );
        }
      }
    }

    if (cardRef.current) {
      void initializeCard();
    }

    return () => {
      cancelled = true;
      cardInstanceRef.current?.destroy();
    };
  }, []);

  const tokenize = React.useCallback(async (): Promise<string> => {
    if (!cardInstanceRef.current) {
      throw new Error("Payment form not ready");
    }
    const result = await cardInstanceRef.current.tokenize();
    if (result.status !== "OK" || !result.token) {
      const msg =
        result.errors?.map((e) => e.message).join(", ") ||
        "Payment tokenization failed";
      throw new Error(msg);
    }
    return result.token;
  }, []);

  return { cardRef, error, isReady, tokenize };
}

/* -------------------------------------------------------------------------- */
/*                          Global type declaration                           */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window {
    Square: {
      payments: (appId: string, locationId: string) => SquarePayments;
    };
  }
}
