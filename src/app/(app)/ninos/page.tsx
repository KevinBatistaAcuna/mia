import { ChildrenManager } from "@/components/ChildrenManager";
import { listChildren } from "@/lib/actions/children";
import { requireEditor } from "@/lib/auth";

export default async function NinosPage() {
  await requireEditor();
  const childrenList = await listChildren(true);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-primary">
          Niños
        </h1>
        <p className="text-muted">
          Alta, monto mensual y estado de los niños de la fundación.
        </p>
      </div>
      <ChildrenManager childrenList={childrenList} />
    </div>
  );
}
