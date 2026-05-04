import type { Metadata } from "next";
import { Tutorial } from "@/components/features/tutorial/Tutorial";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "はじめに",
  description: "AikiNote の初回チュートリアル",
});

export default function NativeOnboardingPage() {
  return <Tutorial mode="native-onboarding" />;
}
