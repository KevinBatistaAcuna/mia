"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";

const allLinks = [
  { href: "/asistencia", label: "Asistencia", roles: ["admin", "assistant"] },
  { href: "/agenda", label: "Agenda", roles: ["admin", "assistant", "therapist"] },
  { href: "/ninos", label: "Niños", roles: ["admin", "assistant"] },
  { href: "/pagos", label: "Pagos", roles: ["admin", "assistant"] },
  { href: "/reportes", label: "Reportes", roles: ["admin", "assistant"] },
] as const;

export function AppNav({
  user,
  foundationName,
}: {
  user: SessionUser;
  foundationName: string;
}) {
  const pathname = usePathname();
  const links = allLinks.filter((link) =>
    (link.roles as readonly string[]).includes(user.role),
  );

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[rgba(243,247,246,0.92)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-primary">
              MIA
            </p>
            <p className="text-sm text-muted">{foundationName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary text-sm">
                Salir
              </button>
            </form>
          </div>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`min-h-10 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-white hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {user.role === "admin" ? (
            <Link
              href="/configuracion"
              className={`min-h-10 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition ${
                pathname.startsWith("/configuracion")
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-white hover:text-foreground"
              }`}
            >
              Configuración
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
