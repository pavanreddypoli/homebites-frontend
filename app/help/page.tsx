import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help — HomeBites AI",
  description: "Help articles and FAQ for HomeBites AI customers and chefs.",
};

const ARTICLES = [
  {
    href: "/help/cottage-food",
    title: "How Cottage Food Works",
    description:
      "Why HomeBites AI is different from delivery apps, what chefs can and can't sell, and how to stay safe.",
  },
];

export default function HelpIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-orange-500 hover:text-orange-600">
          HomeBites AI
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help</h1>
        <p className="text-gray-600 mb-8">Get answers about HomeBites AI.</p>

        <div className="space-y-4">
          {ARTICLES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="block rounded-2xl border border-gray-200 p-6 hover:border-orange-300 hover:shadow-md transition-all"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{a.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{a.description}</p>
            </Link>
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-12">
          Need to reach us? Email{" "}
          <a href="mailto:info@algorythmai.com" className="text-orange-600 underline">
            info@algorythmai.com
          </a>
        </p>
      </main>
    </div>
  );
}
