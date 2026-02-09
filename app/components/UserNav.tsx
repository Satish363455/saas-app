import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function UserNav() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="text-zinc-700 hover:text-zinc-900">
        Login
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.full_name || user.email || "S";
  const avatarUrl = profile?.avatar_url || "";
  const initial = (name ?? "S").charAt(0).toUpperCase();

  return (
    <Link
      href="/settings"
      className="flex items-center"
      title="Profile"
      aria-label="Profile"
    >
      <div className="h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-white grid place-items-center hover:bg-black/5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-black/70">{initial}</span>
        )}
      </div>
    </Link>
  );
}