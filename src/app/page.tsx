import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-navy">
      <main className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/images/usabbv.png"
          alt="US Army Berlin Brigade Veterans"
          width={400}
          height={400}
          priority
          className="rounded-lg"
        />
        <h1 className="text-5xl font-bold tracking-tight text-gold">Berlin Reunion - 2029</h1>
        <p className="max-w-md text-lg text-silver">
          Reconnecting Hellcats &amp; Widowmakers
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-gold px-6 py-2 text-sm font-medium text-navy hover:bg-gold-dark"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-silver px-6 py-2 text-sm font-medium text-silver hover:bg-white/10"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
