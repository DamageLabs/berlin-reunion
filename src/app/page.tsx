import Image from "next/image";

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
      </main>
    </div>
  );
}
