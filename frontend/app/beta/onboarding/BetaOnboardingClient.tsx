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
    const storedEmail =
      window.localStorage.getItem("munch_beta_tester_email") || "";
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-[var(--text)] sm:text-4xl">
          Welcome to the MunchHSV Beta
        </h1>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">
          Start beta onboarding
        </h2>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Enter your name and email so we can track who opened the beta page and who completed onboarding.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleIdentitySubmit}>
          <div>
            <label
              htmlFor="tester-name"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Name
            </label>
            <input
              id="tester-name"
              type="text"
              value={testerName}
              onChange={(event) => setTesterName(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              required
            />
          </div>
          <div>
            <label
              htmlFor="tester-email"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Email
            </label>
            <input
              id="tester-email"
              type="email"
              value={testerEmail}
              onChange={(event) => setTesterEmail(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingIdentity}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--primary-dark)]"
          >
            {isSubmittingIdentity ? "Saving..." : "Save and Continue"}
          </button>
          {identityError ? (
            <p className="text-xs font-medium text-red-500">{identityError}</p>
          ) : null}
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">
          Welcome to the MunchHSV Beta 🎉
        </h2>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Thanks for being selected as a beta tester for MunchHSV — a student-focused food discovery app built around real opinions, not ads.
        </p>
        <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">
          What being a beta tester means:
        </h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--text-muted)]">
          <li>You’re getting early access before public launch</li>
          <li>You’ll use MunchHSV naturally over the next few days</li>
          <li>
            Your votes and feedback directly shape what gets improved, added, or
            removed
          </li>
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
          className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition ${
            identitySubmitted
              ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
              : "cursor-not-allowed bg-[var(--surface-2)] text-[var(--text-muted)]"
          }`}
          aria-disabled={!identitySubmitted}
        >
          Open MunchHSV
        </Link>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">
          Add MunchHSV to your home screen (recommended)
        </h2>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          This makes it work like a real app and easier to open.
        </p>
        <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">
          On iPhone (Safari only):
        </h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-[var(--text-muted)]">
          <li>Open MunchHSV in Safari</li>
          <li>Tap the Share icon (square with an arrow)</li>
          <li>Scroll and tap ‘Add to Home Screen’</li>
          <li>Tap Add</li>
        </ol>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Apple’s official step-by-step guide (with screenshots):
        </p>
        <a
          href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("beta_onboarding_apple_guide_clicked", {})}
          className="mt-2 inline-block break-all text-sm font-semibold text-[var(--primary)] underline underline-offset-2"
        >
          https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
        </a>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">
          How MunchHSV works (quick overview)
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-muted)]">
          <li>Browse food spots near campus</li>
          <li>Tap a place to see details and open it in Maps</li>
          <li>Vote Worth it / Mid / Skip</li>
          <li>Places trend based on real student votes — including yours</li>
        </ul>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Use it the same way you normally decide where to eat. No pressure to
          overthink it. Just be honest.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-[var(--text-muted)]">
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
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
        >
          Go to Trending
        </Link>
      </section>
    </main>
  );
}
