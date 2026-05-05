import LegalDocPage from "../_components/LegalDocPage";
import type { Metadata } from "next";

export const revalidate = 0; // TEMP — restore to 3600 after fix

export const metadata: Metadata = {
  title: "Terms of Service — HomeBites AI",
  description:
    "Terms of Service for the HomeBites AI platform, operated by RedCube Group LLC d/b/a HomeBites AI.",
};

export default function TermsPage() {
  return <LegalDocPage docType="terms_of_service" />;
}
