import { listModuleDefinitions } from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { requirePageIdentity } from "@/lib/auth/dal";
import { AutomationCatalog } from "@/app/(app)/automations/automation-catalog";

export default async function AutomationsPage() {
  await requirePageIdentity();

  // Catalog dựng thẳng từ module definitions (nguồn sự thật app-native, BYOK).
  // Module 1 (Sitemap) chạy qua bridge riêng nên có trang riêng; các module còn
  // lại dùng runner generic. Không còn "schema mô phỏng" — mọi thẻ chạy thật.
  const cards = [
    {
      moduleNumber: 1,
      title: "Sitemap",
      description:
        "Tạo sitemap đầy đủ và chọn tối đa 30 nhãn cho website, kèm sơ đồ cấu trúc — chạy app-native bằng API key của bạn (BYOK).",
      category: "Research",
      href: "/automations/sitemap",
    },
    ...listModuleDefinitions().map((definition) => ({
      moduleNumber: definition.moduleNumber,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      href: `/automations/run/${definition.key}`,
    })),
  ].sort((a, b) => a.moduleNumber - b.moduleNumber);

  return <AutomationCatalog cards={cards} />;
}
