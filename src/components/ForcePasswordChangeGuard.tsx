"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

const ALLOWED_PATHS = ["/change-password", "/login", "/api/"];

export default function ForcePasswordChangeGuard() {
	const { data: session } = useSession();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		if (!session) return;
		const forceChange = (session.user as { forcePasswordChange?: boolean })
			.forcePasswordChange;
		if (!forceChange) return;
		if (ALLOWED_PATHS.some((p) => pathname.startsWith(p))) return;
		router.replace("/change-password");
	}, [session, pathname, router]);

	return null;
}
