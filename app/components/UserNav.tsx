// app/components/UserNav.tsx
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
  const initial = (name ?? "S").charAt(0).toUpperCase();

  return (
    <Link
      href="/account"
      className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-black/10 bg-white"
      title="Account"
      aria-label="Account"
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-black/70">{initial}</span>
      )}
    </Link>
  );
}