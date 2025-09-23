import { toast } from "sonner";

type Options = { description?: string };

export const notify = {
  success(message: string, opts?: Options) {
    toast.success(message, { description: opts?.description });
  },
  error(message: string, opts?: Options) {
    toast.error(message, { description: opts?.description });
  },
  info(message: string, opts?: Options) {
    toast(message, { description: opts?.description });
  },
  limitReached(plan: 'guest'|'free') {
    const msg = plan === 'guest' ? 'Guest limit reached (5). Sign in for more.' : 'Free limit reached (10). Upgrade for unlimited.';
    toast.error(msg);
  },
  payment(result: 'success'|'cancel') {
    if (result === 'success') toast.success('Payment successful. You are now on Pro.');
    else toast('Checkout cancelled');
  },
};


