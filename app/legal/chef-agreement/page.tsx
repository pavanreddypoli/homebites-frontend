import LegalDocPage from "../_components/LegalDocPage";
import type { Metadata } from "next";

export const revalidate = 0; // TEMP — restore to 3600 after fix

export const metadata: Metadata = {
  title: "Chef Agreement — HomeBites AI",
  description:
    "Chef Agreement governing home chef participation on the HomeBites AI marketplace, operated by RedCube Group LLC.",
};

export default function ChefAgreementPage() {
  return <LegalDocPage docType="chef_agreement" />;
}
