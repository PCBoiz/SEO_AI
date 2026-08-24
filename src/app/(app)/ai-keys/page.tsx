import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { requirePageIdentity } from "@/lib/auth/dal";
import { AiKeysForm } from "@/app/(app)/ai-keys/ai-keys-form";

export default async function AiKeysPage() {
  const identity = await requirePageIdentity();
  const statuses = await getAiKeyService().listStatus(identity.userId);
  const providers = listAiProviderStatuses().map((provider) => ({
    id: provider.id,
    label: provider.label,
    model: provider.model,
  }));
  return <AiKeysForm providers={providers} initialKeys={statuses} />;
}
