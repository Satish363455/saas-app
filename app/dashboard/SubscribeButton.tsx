"use client";

export default function SubscribeButton({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}) {
  const onSubscribe = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Checkout failed");
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("No checkout URL returned");
    }
  };

  return (
    <button
      type="button"
      onClick={onSubscribe}
      className="border rounded-md p-2 mt-6"
    >
      Subscribe (Stripe Checkout)
    </button>
  );
}