import { redirect } from "next/navigation";
import { getSessionUser, homePathForRole } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? homePathForRole(user.role) : "/login");
}
