"use client";

import { useEffect, useState } from "react";

import { Button } from "~/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Separator } from "~/ui/primitives/separator";

export function OrderProcessingTimesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Order Processing Times / Tiempos de Procesamiento de Pedidos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-base leading-relaxed text-red-400 md:text-lg">
          <p>
            <b>Orders placed before July 1st</b> will take approximately 3–4 business weeks to be completed and shipped.<br />
            <b>Orders placed on or after July 1st</b> will be processed within 4–6 business weeks. <br />
            <b>Orders placed on or after August 1st</b> will require approximately 8–12 business weeks for completion and shipping.
          </p>

          <Separator />

          <p>
            <b>Los pedidos realizados antes del 1 de julio</b> tardarán aproximadamente de 3 a 4 semanas hábiles en ser completados y enviados.<br />
            <b>Los pedidos realizados a partir del 1 de julio</b> serán procesados dentro de un plazo de 4 a 6 semanas hábiles. <br />
            <b>Los pedidos realizados el 1 de agosto o después</b> requerirán aproximadamente 8–12 semanas hábiles para su finalización y envío.
          </p>
        </div>

        <DialogFooter>
          <Button size="lg" onClick={() => setOpen(false)}>
            Got it / Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
