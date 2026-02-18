import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/images/usabbv.png"
          alt="US Army Berlin Brigade Veterans"
          width={400}
          height={400}
          priority
          className="rounded-lg"
        />
        <h1 className="text-5xl font-bold tracking-tight">Berlin Reunion - 2029</h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Reconnecting Hellcats &amp; Widowmakers
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-zinc-300 px-6 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
