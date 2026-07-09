import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { getCurrentWeekStart } from "@/lib/queries";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CPO Portfolio Dashboard",
  description: "Дашборд приоритизации и ресурсного планирования ATOM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";

  if (pathname === "/login") {
    return (
      <html lang="ru" className={`${inter.variable} h-full`}>
        <body className="min-h-full font-sans antialiased">{children}</body>
      </html>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const currentWeek = await getCurrentWeekStart();

  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppShell currentWeek={currentWeek} pathname={pathname} user={user}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
