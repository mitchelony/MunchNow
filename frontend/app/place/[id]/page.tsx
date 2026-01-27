import Link from "next/link";

export default function PlacePage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 pb-16 pt-12">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--text-muted)]"
      >
        <span aria-hidden>←</span>
        Back to trending
      </Link>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Place
        </p>
        <h1 className="text-2xl font-semibold">{params.id}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Place details are coming soon. For now, tap a card on the home page to
          open maps and vote.
        </p>
      </div>
    </div>
  );
}
