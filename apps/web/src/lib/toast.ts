/** Petite bulle de confirmation en bas de l'écran (affichée par `Toaster`) */
export const TOAST_EVENT = 'mc01-toast';

export function showToast(message: string): void {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}
