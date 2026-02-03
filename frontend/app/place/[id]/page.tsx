import Link from "next/link";

const PLACE_DETAILS = {
  name: "Big Ed's Pizza",
  type: "Pizza • Dive Bar",
  status: "Open Now",
  tagline: "Classic Dive & Slices in Downtown Huntsville",
  distance: "1.2 mi",
  hours: "Until 2 AM",
  price: "$$",
  votes: {
    worth: 72,
    mid: 21,
    skip: 7,
    total: 842,
  },
  vibe:
    "Loud, energetic, and perfect for groups. Expect grease, graffiti on the walls, and the best playlist in town.",
  mustTry: {
    title: "Hot Honey Pepperoni",
    detail: "Crispy cups, spicy honey drizzle, fresh basil. A local legend.",
  },
  addressLine: "255 Pratt Ave NE",
  addressCity: "Huntsville, AL 35801",
};

export default function PlacePage({ params }: { params: { id: string } }) {
  const displayName = params.id ? decodeURIComponent(params.id) : PLACE_DETAILS.name;

  return (
    <div className="theme-place min-h-screen bg-[var(--bg)] font-display text-[var(--text)]">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-32">
        <div className="sticky top-0 z-40 border-b border-transparent bg-[var(--bg)]/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-12 pb-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-2)]"
              aria-label="Back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-2)]"
              aria-label="Share"
            >
              <span className="material-symbols-outlined">ios_share</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6">
          <div className="mb-5 mt-2">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
                {PLACE_DETAILS.status}
              </span>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                {PLACE_DETAILS.type}
              </span>
            </div>
            <h1 className="text-5xl font-black leading-[0.9] tracking-tighter text-[var(--text)]">
              {displayName}
            </h1>
            <p className="mt-3 text-lg font-medium leading-snug text-[var(--text-muted)]">
              {PLACE_DETAILS.tagline}
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-3 border-b border-[var(--border)] pb-8">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
                near_me
              </span>
              <p className="text-sm font-bold text-[var(--text)]">
                {PLACE_DETAILS.distance}
              </p>
            </div>
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
                schedule
              </span>
              <p className="text-sm font-bold text-[var(--text)]">
                {PLACE_DETAILS.hours}
              </p>
            </div>
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
                attach_money
              </span>
              <p className="text-sm font-bold text-[var(--text)]">
                {PLACE_DETAILS.price}
              </p>
            </div>
          </div>

          <div className="mb-10">
            <div className="mb-4 flex items-end justify-between px-1">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">
                  Verdict
                </h2>
                <p className="text-sm font-medium text-[var(--text-muted)]">
                  {PLACE_DETAILS.votes.total} student votes
                </p>
              </div>
              <div className="flex -space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-[var(--bg)]">
                  JD
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700 ring-2 ring-[var(--bg)]">
                  MK
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--text-muted)] ring-2 ring-[var(--bg)]">
                  +
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                className="group relative flex h-32 flex-col items-center justify-between rounded-2xl border-2 border-[var(--primary)]/20 bg-[var(--surface)] p-3 shadow-sm transition active:scale-[0.98] hover:border-[var(--primary)]"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="self-end text-xs font-bold text-[var(--primary)]">
                  {PLACE_DETAILS.votes.worth}%
                </span>
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined filled text-[22px]">
                    thumb_up
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--text)]">
                  Worth it!
                </span>
              </button>
              <button
                type="button"
                className="group relative flex h-32 flex-col items-center justify-between rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition active:scale-[0.98] hover:border-yellow-400"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="self-end text-xs font-bold text-[var(--text-muted)] group-hover:text-yellow-600">
                  {PLACE_DETAILS.votes.mid}%
                </span>
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-[22px]">
                    sentiment_neutral
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--text)]">Mid</span>
              </button>
              <button
                type="button"
                className="group relative flex h-32 flex-col items-center justify-between rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition active:scale-[0.98] hover:border-red-400"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="self-end text-xs font-bold text-[var(--text-muted)] group-hover:text-red-600">
                  {PLACE_DETAILS.votes.skip}%
                </span>
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-[22px]">
                    thumb_down
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--text)]">Skip</span>
              </button>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-[var(--primary)]" />
              <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">
                The Vibe
              </h3>
            </div>
            <p className="text-lg font-medium leading-relaxed text-[var(--text-muted)]">
              &quot;{PLACE_DETAILS.vibe}&quot;
            </p>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-[var(--primary)]" />
              <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">
                Must Try
              </h3>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="text-lg font-bold text-[var(--text)]">
                      {PLACE_DETAILS.mustTry.title}
                    </h4>
                    <span
                      className="material-symbols-outlined filled text-sm text-orange-500"
                      title="Spicy"
                    >
                      local_fire_department
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-[var(--text-muted)]">
                    {PLACE_DETAILS.mustTry.detail}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-[var(--primary)]" />
              <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">
                Location
              </h3>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <span className="material-symbols-outlined filled">
                  location_on
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-[var(--text)]">
                  {PLACE_DETAILS.addressLine}
                </span>
                <span className="mb-2 text-sm text-[var(--text-muted)]">
                  {PLACE_DETAILS.addressCity}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-bold text-[var(--primary)] transition hover:opacity-80"
                >
                  Open in Maps
                  <span className="material-symbols-outlined text-[16px]">
                    open_in_new
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-[var(--border)] bg-[var(--surface)]/90 p-4 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md gap-3">
            <button
              type="button"
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-transparent transition active:scale-95 hover:bg-[var(--surface-2)]"
            >
              <span className="material-symbols-outlined">bookmark_border</span>
              <span className="text-base font-bold">Save</span>
            </button>
            <button
              type="button"
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-[var(--bg)] shadow-lg transition active:scale-95 hover:opacity-90"
            >
              <span className="material-symbols-outlined filled">directions</span>
              <span className="text-base font-bold">Get Directions</span>
            </button>
          </div>
          <div className="h-2 w-full" />
        </div>
      </div>
    </div>
  );
}
