"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import TopBar from "../components/TopBar";
import PlaceCard from "../components/PlaceCard";
import { getCampuses, getPlaces } from "../lib/api";
import type { Campus, Place } from "../lib/types";

function computeVoteCounts(place: Place) {
  const worth = place.worth_it_count ?? 0;
  const mid = place.mid_count ?? 0;
  const skip = place.skip_count ?? 0;
  const total = place.total_votes ?? worth + mid + skip;
  return { worth, mid, skip, total };
}

export default function ClosePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [campusPickerOpen, setCampusPickerOpen] = useState(false);

  const selectedCampus = useMemo(
    () => campuses.find((campus) => campus.id === campusId) ?? null,
    [campuses, campusId]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("munchhsv_campus_id");
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        setCampusId(parsed);
      }
    } else {
      setCampusPickerOpen(true);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    getCampuses()
      .then((data) => {
        if (!isActive) return;
        setCampuses(data);
        if (campusId && !data.some((campus) => campus.id === campusId)) {
          setCampusId(null);
          setCampusPickerOpen(true);
        }
      })
      .catch(() => {
        if (isActive) setCampuses([]);
      });
    return () => {
      isActive = false;
    };
  }, [campusId]);

  useEffect(() => {
    let isActive = true;
    if (!campusId) {
      setLoading(false);
      setPlaces([]);
      setError(null);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setError(null);
    getPlaces({
      campusId,
      city: selectedCampus?.city ?? "Huntsville",
      limit: 30,
      sort: "closest",
    })
      .then((data) => {
        if (isActive) setPlaces(data);
      })
      .catch(() => {
        if (isActive) setError("Could not load nearby places.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [campusId, selectedCampus?.city]);

  const themeStyle: CSSProperties = {
    ["--primary" as string]: "#3b82f6",
    ["--primary-dark" as string]: "#2563eb",
    ["--primary-soft" as string]: "rgba(59, 130, 246, 0.16)",
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-28"
      style={themeStyle}
    >
      <header className="fixed top-0 left-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md transition-all">
        <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10 2xl:px-16">
          <TopBar
            campusName={selectedCampus?.short_name ?? selectedCampus?.name ?? null}
            onChangeCampus={() => setCampusPickerOpen(true)}
          />
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col pt-[96px]">
        {campusPickerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-lg">
              <h2 className="text-lg font-semibold">
                Pick your campus for better picks
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                We use this to sort places by distance.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {campuses.map((campus) => (
                  <button
                    key={campus.id}
                    type="button"
                    className="rounded-xl border border-[var(--border)] px-4 py-3 text-left text-sm font-medium hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setCampusId(campus.id);
                      setCampusPickerOpen(false);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "munchhsv_campus_id",
                          String(campus.id)
                        );
                      }
                    }}
                  >
                    {campus.short_name ?? campus.name}
                  </button>
                ))}
              </div>
              {campuses.length === 0 && (
                <p className="mt-4 text-sm text-[var(--text-muted)]">
                  Loading campuses…
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-none px-4 pt-8 pb-4 sm:px-6 lg:px-10 2xl:px-16">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.1] tracking-tight text-[var(--text)]">
            Close to {selectedCampus?.short_name ?? selectedCampus?.name ?? "Campus"}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--text-muted)]">
            Sorted purely by distance from your campus.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 pb-8 sm:px-6 lg:px-10 2xl:px-16">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-48 rounded-2xl skeleton-shimmer"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
              {error}
            </div>
          ) : places.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
              No places yet.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              {places.map((place, index) => {
                const votes = computeVoteCounts(place);
                return (
                  <PlaceCard
                    key={String(place.id)}
                    place={place}
                    rank={index + 1}
                    voteCounts={votes}
                    size="stacked"
                    showDistanceBubble
                    onSelect={() => {}}
                    onVote={() => {}}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-100 bg-[var(--surface)]/95 backdrop-blur-md shadow-[var(--shadow-nav)]">
        <div className="mx-auto flex h-[84px] max-w-none items-start justify-around px-4 pt-3 pb-8 sm:px-6 lg:px-10 2xl:px-16">
          <Link
            href="/"
            className="group flex flex-1 flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <div className="rounded-full p-1 transition-colors group-hover:bg-[var(--surface-2)]">
              <span className="material-symbols-outlined text-[26px]">
                explore
              </span>
            </div>
            <span className="text-[11px] font-medium">Discover</span>
          </Link>
          <button
            type="button"
            className="group flex flex-1 flex-col items-center gap-1.5"
            aria-current="page"
          >
            <div className="rounded-full bg-[var(--primary-soft)] p-1 transition-colors">
              <span className="material-symbols-outlined filled text-[26px] text-[var(--primary)]">
                near_me
              </span>
            </div>
            <span className="text-[11px] font-bold text-[var(--primary)]">
              Close
            </span>
          </button>
          <Link
            href="/saved"
            className="group flex flex-1 flex-col items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            <div className="rounded-full p-1 transition-colors group-hover:bg-[var(--surface-2)]">
              <span className="material-symbols-outlined text-[26px]">
                bookmark
              </span>
            </div>
            <span className="text-[11px] font-medium">Saved</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
