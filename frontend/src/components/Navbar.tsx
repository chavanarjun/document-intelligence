"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageSquare, Sparkles } from "lucide-react";

const navLinks = [
  { href: "/", label: "Library", icon: BookOpen },
  { href: "/chat", label: "Ask AI", icon: MessageSquare },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        background: "rgba(9, 9, 11, 0.85)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 32px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" className="group" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
            }}
          >
            <Sparkles style={{ width: "18px", height: "18px", color: "#fff" }} />
          </div>
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "#e4e4e7",
              letterSpacing: "-0.02em",
            }}
          >
            BookBrain
          </span>
        </Link>

        {/* Nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
          }}
        >
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: active ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none",
                }}
              >
                <Icon style={{ width: "16px", height: "16px" }} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
