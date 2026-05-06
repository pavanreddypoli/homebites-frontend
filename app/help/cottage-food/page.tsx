import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import MarkdownPageLayout from "@/components/MarkdownPageLayout";

export const metadata: Metadata = {
  title: "How Cottage Food Works — HomeBites AI",
  description:
    "Why HomeBites AI is different from delivery apps. Texas Cottage Food Law explained for customers — what chefs can sell, allergen safety, and how reporting works.",
};

export const revalidate = 3600;

export default async function CottageFoodHelpPage() {
  const filePath = path.join(process.cwd(), "docs/help/cottage-food-explained.md");
  const content = await fs.readFile(filePath, "utf-8");

  return (
    <MarkdownPageLayout
      content={content}
      ctaLabel="Browse home chefs near you →"
      ctaHref="/dashboard/customer"
    />
  );
}
