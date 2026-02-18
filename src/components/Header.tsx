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
    <header className="bg-navy-dark">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-gold tracking-tight">
          Berlin Reunion
        </Link>

        <nav className="flex items-center gap-1">
          {isPending ? (
            <span className="text-sm text-silver/50">...</span>
          ) : session ? (
            <>
              <NavLink href="/hello" current={pathname}>
                Home
              </NavLink>
              {(role === "admin" || role === "moderator") && (
                <NavLink href="/admin" current={pathname}>
                  Admin
                </NavLink>
              )}
              <span className="mx-2 hidden text-sm text-silver/40 sm:inline">
                |
              </span>
              <span className="hidden text-sm text-silver sm:inline">
                {session.user.name}
              </span>
              <button
                onClick={handleSignOut}
                className="ml-2 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-gold hover:bg-navy-light"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login" current={pathname}>
                Sign In
              </NavLink>
              <Link
                href="/register"
                className="ml-1 rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-navy hover:bg-gold-dark"
              >
                Register
              </Link>
            </>
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
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-navy text-gold"
          : "text-silver hover:text-gold hover:bg-navy/50"
      }`}
    >
      {children}
    </Link>
  );
}
