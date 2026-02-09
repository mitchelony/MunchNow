import type { Metadata } from "next";
import BetaOnboardingClient from "./BetaOnboardingClient";

export const metadata: Metadata = {
  title: "Welcome to the MunchHSV Beta",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BetaOnboardingPage() {
  return <BetaOnboardingClient />;
}
