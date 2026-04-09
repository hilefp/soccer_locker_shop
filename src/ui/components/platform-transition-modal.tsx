"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Separator } from "~/ui/primitives/separator";
import { Button } from "~/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";

const STORAGE_KEY = "platform-transition-dismissed";

export function PlatformTransitionModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleDismiss()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* English */}
        <DialogHeader>
          <DialogTitle className="text-xl">
            Welcome to Our New Platform!
          </DialogTitle>
          <DialogDescription className="pt-2 text-base leading-relaxed">
            We have upgraded to a brand-new system to serve you better. Your
            previous account from our old platform{" "}
            <strong>does not carry over</strong> to this new site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            To continue shopping with us, please{" "}
            <strong className="text-foreground">create a new account</strong>.
            It only takes a minute.
          </p>
          <p>
            We apologize for any inconvenience and appreciate your patience
            during this transition.
          </p>
        </div>

        <Separator />

        {/* Spanish */}
        <div>
          <h3 className="text-lg font-semibold">
            Bienvenido a Nuestra Nueva Plataforma!
          </h3>
          <p className="pt-2 text-base leading-relaxed text-muted-foreground">
            Hemos actualizado a un nuevo sistema para servirle mejor. Su cuenta
            anterior de nuestra antigua plataforma{" "}
            <strong>no se transfiere</strong> a este nuevo sitio.
          </p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Para continuar comprando con nosotros, por favor{" "}
            <strong className="text-foreground">cree una nueva cuenta</strong>.
            Solo toma un minuto.
          </p>
          <p>
            Nos disculpamos por cualquier inconveniente y agradecemos su
            paciencia durante esta transicion.
          </p>
        </div>

        <DialogFooter className="gap-4">
          <Button variant="outline" onClick={handleDismiss}>
            Got it / Entendido
          </Button>
          <Button asChild onClick={handleDismiss}>
            <Link href="/auth/register">
              Create New Account / Crear Cuenta
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
