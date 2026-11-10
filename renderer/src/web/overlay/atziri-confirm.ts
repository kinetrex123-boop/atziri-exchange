// Atziri Exchange: yes / no questions shown inside the overlay
// (a Windows dialog would take the focus and close the overlay)
import { shallowRef } from "vue";

export const confirmAsk = shallowRef<{ text: string; resolve: (ok: boolean) => void } | null>(null);

export function askConfirm(text: string): Promise<boolean> {
  confirmAsk.value?.resolve(false);
  return new Promise((resolve) => {
    confirmAsk.value = {
      text,
      resolve: (ok) => {
        confirmAsk.value = null;
        resolve(ok);
      },
    };
  });
}
