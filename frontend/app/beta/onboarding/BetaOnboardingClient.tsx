"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "../../../lib/analytics";
import { submitBetaTester } from "../../../lib/api";

export default function BetaOnboardingClient() {
  const pathname = usePathname();
  const [testerName, setTesterName] = useState("");
  const [testerEmail, setTesterEmail] = useState("");
  const [identitySubmitted, setIdentitySubmitted] = useState(false);
  const [isSubmittingIdentity, setIsSubmittingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedName = window.localStorage.getItem("munch_beta_tester_name") || "";
    const storedEmail = window.localStorage.getItem("munch_beta_tester_email") || "";
    if (storedName && storedEmail) {
      setTesterName(storedName);
      setTesterEmail(storedEmail);
      setIdentitySubmitted(true);
    }
  }, []);

  useEffect(() => {
    trackEvent("beta_onboarding_view", {
      path: pathname || "/beta/onboarding",
      referrer:
        typeof document !== "undefined" ? document.referrer || undefined : undefined,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent || undefined : undefined,
      tester_name: testerName || undefined,
      tester_email: testerEmail || undefined,
    });
  }, [pathname, testerName, testerEmail]);

  const handleIdentitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = testerName.trim();
    const email = testerEmail.trim().toLowerCase();
    if (!name || !email) return;

    setIdentityError("");
    setIsSubmittingIdentity(true);
    try {
      await submitBetaTester({
        name,
        email,
        source: "beta_onboarding",
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("munch_beta_tester_name", name);
        window.localStorage.setItem("munch_beta_tester_email", email);
      }
      setTesterName(name);
      setTesterEmail(email);
      setIdentitySubmitted(true);
      trackEvent("beta_onboarding_identity_submitted", {
        tester_name: name,
        tester_email: email,
      });
    } catch {
      setIdentityError("Could not save your info. Please try again.");
    } finally {
      setIsSubmittingIdentity(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#1a1a1a] p-6 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Beta Access
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Welcome to the MunchNow Beta
          </h1>
          <p className="mt-3 text-sm md:text-base text-gray-600 dark:text-gray-300">
            Help shape the app by using it naturally and voting on places around campus.
          </p>
        </header>

        <section className="mt-5 rounded-3xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#1a1a1a] p-6 shadow-lg">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Start onboarding</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Enter your name and email so we can track beta onboarding completion.
          </p>

          <form className="mt-4 space-y-3" onSubmit={handleIdentitySubmit}>
            <div>
              <label htmlFor="tester-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Name
              </label>
              <input
                id="tester-name"
                type="text"
                value={testerName}
                onChange={(event) => setTesterName(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-transparent bg-gray-50 dark:bg-[#232323] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>
            <div>
              <label htmlFor="tester-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Email
              </label>
              <input
                id="tester-email"
                type="email"
                value={testerEmail}
                onChange={(event) => setTesterEmail(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 dark:border-transparent bg-gray-50 dark:bg-[#232323] px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingIdentity}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              {isSubmittingIdentity ? "Saving..." : "Save and Continue"}
            </button>
            {identityError ? <p className="text-xs font-medium text-red-500">{identityError}</p> : null}
          </form>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#1a1a1a] p-6 shadow-lg">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">What beta testers do</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Use MunchNow in real situations (when deciding where to eat)</li>
            <li>Vote honestly on places: Worth it, Mid, or Skip</li>
            <li>Share any issues or ideas you notice</li>
          </ul>
          <Link
            href="/"
            onClick={(event) => {
              if (!identitySubmitted) {
                event.preventDefault();
                return;
              }
              trackEvent("beta_onboarding_open_app_clicked", {
                tester_name: testerName || undefined,
                tester_email: testerEmail || undefined,
                onboarding_complete: true,
              });
            }}
            className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              identitySubmitted
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "cursor-not-allowed bg-gray-200 dark:bg-[#262626] text-gray-500 dark:text-gray-400"
            }`}
            aria-disabled={!identitySubmitted}
          >
            Open MunchNow
          </Link>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#1a1a1a] p-6 shadow-lg">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Add to home screen</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            On iPhone Safari: Share icon → Add to Home Screen.
          </p>
          <a
            href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("beta_onboarding_apple_guide_clicked", {})}
            className="mt-3 inline-block text-sm font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
          >
            Apple official guide
          </a>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#1a1a1a] p-6 shadow-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Thanks for helping build something for students, by students.
          </p>
          <Link
            href="/"
            onClick={() =>
              trackEvent("beta_onboarding_go_trending_clicked", {
                tester_name: testerName || undefined,
                tester_email: testerEmail || undefined,
              })
            }
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 dark:border-transparent bg-gray-100 dark:bg-[#262626] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white transition hover:bg-gray-200 dark:hover:bg-[#2f2f2f]"
          >
            Go to Trending
          </Link>
        </section>
      </div>
    </main>
  );
}
