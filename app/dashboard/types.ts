// app/dashboard/types.ts

export type TrackedSub = {
  id: string;
  user_id: string;

  merchant_name: string;
  plan_name: string | null;

  amount: number;
  currency: string;

  renewal_date: string; // YYYY-MM-DD (or ISO string)
  billing_cycle?: string | null;

  status: string;
  cancelled_at?: string | null;

  notes: string | null;

  created_at?: string;
  last_reminded_renewal_date?: string | null;
};

export type CreateTrackedSubPayload = {
  merchant_name: string;
  plan_name?: string | null;
  amount: number;
  currency: string;
  renewal_date: string;
  billing_cycle?: string;
  status?: string;
  notes?: string | null;
};