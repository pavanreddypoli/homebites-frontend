import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import MarkdownPageLayout from "@/components/MarkdownPageLayout";

export const metadata: Metadata = {
  title: "Become a Chef on HomeBites AI",
  description:
    "Cook from your home kitchen and earn money on your own schedule. HomeBites AI operates under Texas Cottage Food Law — find out if you qualify and how to get started.",
};

export const revalidate = 3600;

export default async function BecomeAChefPage() {
  const filePath = path.join(process.cwd(), "docs/legal/10-chef-requirements-guide.md");
  const content = await fs.readFile(filePath, "utf-8");

  return (
    <MarkdownPageLayout
      content={content}
      ctaLabel="Get Started — Sign Up Free →"
      ctaHref="/signup"
    />
  );
}
