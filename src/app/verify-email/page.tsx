"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "No verification token provided.",
  );

  useEffect(() => {
    if (!token) return;

    authClient
      .verifyEmail({ query: { token } })
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message ?? "Verification failed");
        } else {
          setStatus("success");
          setMessage("Email verified! Redirecting...");
          setTimeout(() => router.push("/hello"), 2000);
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Verification failed. The link may have expired.");
      });
  }, [token, router]);

  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      <h1 className="text-2xl font-bold">Email Verification</h1>

      {status === "loading" && (
        <p className="text-sm text-silver">{message}</p>
      )}

      {status === "success" && (
        <p className="text-sm text-field-green">
          {message}
        </p>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-crimson">{message}</p>
          <Link href="/login" className="text-sm font-medium underline">
            Go to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={<p className="text-sm text-silver">Loading...</p>}
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
