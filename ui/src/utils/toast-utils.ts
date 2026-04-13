/**
 * toast-utils.ts
 * Wrappers around react-hot-toast for consistent toast behaviour across MakerSuite.
 *
 * Persistent toasts (duration: Infinity, must be manually dismissed):
 *   - Delete / deactivate actions
 *   - Draft listing created
 *   - Etsy token expired / reconnected
 *   - Etsy connection successful
 *
 * Normal toasts (auto-dismiss after ~4s):
 *   - Sync operations
 *   - Save internally / save to Etsy
 *   - Photo uploads
 *   - Restock / deduct
 *   - Routine operations
 */

import toast from "react-hot-toast";

// ── Persistent toasts ──────────────────────────────────────────────────────

export const persistentSuccess = (message: string) =>
  toast.success(message, { duration: Infinity });

export const persistentError = (message: string) =>
  toast.error(message, { duration: Infinity });

// ── Normal toasts (use these for routine operations) ───────────────────────

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  loading: (message: string) => toast.loading(message),
};