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
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
        {children}
      </main>
    </>
  );
}
