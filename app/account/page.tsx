// app/account/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  await supabase.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <p className="mt-2 text-sm text-black/60">Your user details.</p>

      <div className="mt-6 max-w-2xl">
        <AccountForm
          email={user.email ?? ""}
          initial={{
            full_name: profile?.full_name ?? "",
            avatar_url: profile?.avatar_url ?? "",
          }}
        />
      </div>

      <form action="/auth/signout" method="post" className="mt-8">
        <button className="rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white">
          Sign out
        </button>
      </form>
    </main>
  );
}