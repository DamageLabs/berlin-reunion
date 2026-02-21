"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const role = session
    ? ((session.user as { role?: string }).role ?? "user")
    : null;

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/"),
      },
    });
  }

  return (
    <header className="bg-charcoal border-b border-gold-dark/30">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-[0.15em] text-gold"
        >
          Berlin Reunion
        </Link>

        <nav className="flex items-center gap-1">
          {isPending ? (
            <span className="text-sm text-cream/40">...</span>
          ) : session ? (
            <>
              <NavLink href="/home" current={pathname}>
                Home
              </NavLink>
              <NavLink href="/calendar" current={pathname}>
                Calendar
              </NavLink>
              {(role === "admin" || role === "moderator") && (
                <NavLink href="/admin" current={pathname}>
                  Admin
                </NavLink>
              )}
              <span className="mx-2 hidden text-sm text-gold-dark/40 sm:inline">
                |
              </span>
              <Link
                href="/profile"
                className="hidden items-center gap-2 sm:flex"
              >
                {(session.user as { image?: string }).image ? (
                  <img
                    src={(session.user as { image?: string }).image!}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full object-cover"
                  />
                ) : null}
                <span className="font-[family-name:var(--font-oswald)] text-sm font-light tracking-wide text-cream/70">
                  {session.user.name}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="ml-2 rounded-md border border-gold-dark/40 bg-charcoal-light px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/20"
              >
                Sign Out
              </button>
            </>
          ) : (
            <NavLink href="/login" current={pathname}>
              Sign In
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: string;
  children: React.ReactNode;
}) {
  const active = current === href;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider transition-colors ${
        active
          ? "bg-gold-dark/20 text-gold"
          : "text-cream/60 hover:text-gold hover:bg-gold-dark/10"
      }`}
    >
      {children}
    </Link>
  );
}
