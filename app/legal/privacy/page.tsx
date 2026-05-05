import LegalDocPage from "../_components/LegalDocPage";
import type { Metadata } from "next";

export const revalidate = 0; // TEMP — restore to 3600 after fix

export const metadata: Metadata = {
  title: "Privacy Policy — HomeBites AI",
  description:
    "Privacy Policy for the HomeBites AI platform, operated by RedCube Group LLC d/b/a HomeBites AI.",
};

export default function PrivacyPage() {
  return <LegalDocPage docType="privacy_policy" />;
}
