"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/moderation", label: "Moderation Queue" },
  { href: "/admin/incidents",  label: "Incidents" },
  { href: "/admin/audit-log",  label: "Audit Log" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center gap-1 max-w-6xl mx-auto">
        {LINKS.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="px-4 py-3 text-[13px] font-medium transition-colors"
              style={{
                color: active ? "#111827" : "#6B7280",
                borderBottom: active ? "2px solid #111827" : "2px solid transparent",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
