export type TrackedSub = {
  id: string;
  user_id: string;

  merchant_name: string;
  plan_name: string | null;
  amount: number;
  currency: string;
  renewal_date: string;
  status: string;
  notes: string | null;

  created_at?: string;
};