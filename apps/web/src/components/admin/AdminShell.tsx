"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { AdminButton } from "./ui";

const nav = [
  { href: "/admin", label: "Mini Apps" },
  { href: "/admin/submissions", label: "Submissions" },
];

/** Frames every admin page and keeps anyone who is not signed in out of them. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === "/admin/login";
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let current = true;
    api.get<{ admin: boolean }>("/api/admin/session").then(
      (result) => current && setAdmin(result.admin),
      () => current && setAdmin(false),
    );
    return () => {
      current = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (admin === false && !onLogin) router.replace("/admin/login");
    if (admin === true && onLogin) router.replace("/admin");
  }, [admin, onLogin, router]);

  async function signOut() {
    await api.delete("/api/admin/session").catch((error: unknown) => console.error(error));
    setAdmin(false);
    router.replace("/admin/login");
  }

  const signedIn = admin === true && !onLogin;
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-5">
          <span className="font-semibold">CrackPay Admin</span>
          {signedIn && (
            <>
              <nav className="flex gap-1 text-sm">
                {nav.map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/apps") : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-lg px-3 py-1.5 ${active ? "bg-surface font-medium" : "text-muted"}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <AdminButton className="ml-auto" onClick={signOut}>
                Sign out
              </AdminButton>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-5 py-6">
        {onLogin || signedIn ? children : <p className="text-sm text-muted">Checking your session…</p>}
      </main>
    </div>
  );
}
