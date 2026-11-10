import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/actions/settings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const settings = await getSettings();

  return (
    <>
      <AppNav
        user={user}
        foundationName={settings?.foundationName ?? "Fundación"}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </>
  );
}
