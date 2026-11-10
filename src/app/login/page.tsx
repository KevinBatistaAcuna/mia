import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/asistencia");

  return (
    <main className="flex flex-1 items-center px-4 py-10">
      <LoginForm />
    </main>
  );
}
