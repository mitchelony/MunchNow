import Link from "next/link";

export default function InfoPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--text)]">
        Construction in progress
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        This page should be built soon... maybe, probably.
      </p>
      <Link
        href="/"
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
      >
        Back to Home
      </Link>
    </div>
  );
}
