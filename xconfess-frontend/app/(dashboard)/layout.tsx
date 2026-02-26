import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "@/app/components/layout/Header";
import { AuthGuard } from "@/app/components/AuthGuard";
import { useAuth } from "@/app/lib/hooks/useAuth";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading && pathname.startsWith("/admin") && user?.role !== "admin") {
			router.push("/dashboard");
		}
	}, [pathname, user, isLoading, router]);

	if (!isLoading && pathname.startsWith("/admin") && user?.role !== "admin") {
		return null; // Prevent flash of admin content
	}

	return (
		<AuthGuard>
			<div className='min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'>
				<Header />
				<main className='mx-auto max-w-3xl px-4 py-8 sm:px-6'>
					{children}
				</main>
			</div>
		</AuthGuard>
	);
}
