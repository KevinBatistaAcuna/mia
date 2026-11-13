import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/SettingsPanel";
import { getSettings, listUsers } from "@/lib/actions/settings";
import { requireUser } from "@/lib/auth";

export default async function ConfiguracionPage() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect(user.role === "therapist" ? "/agenda" : "/asistencia");
  }

  const [settings, users] = await Promise.all([getSettings(), listUsers()]);

  if (!settings) {
    return (
      <div className="card p-8 text-center text-muted">
        No hay configuración. Ejecuta el seed de la base de datos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-primary">
          Configuración
        </h1>
        <p className="text-muted">
          Solo la administradora gestiona usuarios, días de atención y el ciclo
          A/B.
        </p>
      </div>
      <SettingsPanel
        settings={settings}
        users={users}
        currentUserId={user.id}
      />
    </div>
  );
}
