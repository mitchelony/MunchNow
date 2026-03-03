"use client";

import Image from "next/image";
import type { Campus } from "../../lib/types";

type CampusPickerModalProps = {
  campuses: Campus[];
  selectedCampusId: number | null;
  onClose: () => void;
  onSelect: (campusId: number) => void;
};

function getCampusMeta(campus: Campus) {
  const label = (campus.short_name ?? campus.name ?? "").toLowerCase();
  const isAamu = label.includes("aamu") || label.includes("alabama a&m");
  if (isAamu) {
    return {
      short: "AAMU",
      full: "Alabama A&M University",
      logo: "/campus/aamu.png",
      logoBg: "#7c1d3b",
      logoWrap: "p-0",
      card: "border-[#ff5a00] bg-[#2a0717]",
      check: "bg-[#ff5a00]",
    };
  }
  return {
    short: "UAH",
    full: "University of Alabama in Huntsville",
    logo: "/campus/uah.png",
    logoBg: "#0b3f97",
    logoWrap: "p-0",
    card: "border-[#27457a] bg-[#101a2e]",
    check: "bg-[#0b5fff]",
  };
}

export default function CampusPickerModal({
  campuses,
  selectedCampusId,
  onClose,
  onSelect,
}: CampusPickerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-[26px] border border-white/10 bg-[#111318] p-9 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-3xl font-bold tracking-tight">Select Your Campus</h2>
        <p className="mt-3 text-base text-slate-400">
          We&apos;ll show you places sorted by distance from your campus
        </p>

        <div className="mt-10 space-y-5">
          {campuses.map((campus) => {
            const meta = getCampusMeta(campus);
            const selected = selectedCampusId === campus.id;
            return (
              <button
                key={campus.id}
                type="button"
                onClick={() => onSelect(campus.id)}
                className={`w-full rounded-3xl border p-6 text-left transition ${
                  selected ? meta.card : "border-[#243044] bg-[#0f1728] hover:border-[#2d3c56]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div
                      className={`h-20 w-20 overflow-hidden rounded-2xl border border-white/10 ${meta.logoWrap}`}
                      style={{ backgroundColor: meta.logoBg }}
                    >
                      <Image
                        src={meta.logo}
                        alt={`${meta.short} logo`}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold leading-none">{meta.short}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{meta.full}</p>
                    </div>
                  </div>
                  {selected ? (
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white ${meta.check}`}
                    >
                      <span className="material-symbols-outlined text-[24px]">check</span>
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
