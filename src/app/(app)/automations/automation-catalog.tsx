import Link from "next/link";
import {
  BarChart3,
  FileText,
  Search,
  Upload,
  Video,
  Zap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CatalogCard {
  moduleNumber: number;
  title: string;
  description: string;
  category: string;
  href: string;
}

const categoryVariants: Record<
  string,
  "blue" | "purple" | "success" | "warning" | "outline"
> = {
  Research: "blue",
  SEO: "purple",
  Content: "success",
  Publishing: "warning",
  Video: "outline",
};

const categoryLabels: Record<string, string> = {
  Research: "Nghiên cứu",
  SEO: "SEO",
  Content: "Nội dung",
  Publishing: "Xuất bản",
  Video: "Video",
};

const categoryIcons: Record<string, LucideIcon> = {
  Research: Search,
  SEO: BarChart3,
  Content: FileText,
  Publishing: Upload,
  Video,
};

export function AutomationCatalog({ cards }: { cards: CatalogCard[] }) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Tự động hóa · chạy từng bước
          </h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Mỗi thẻ là một module độc lập chạy bằng API key của bạn (BYOK): mở ra,
            nhập đầu vào (có preset + lịch sử theo dự án) và chạy riêng lẻ. Muốn
            chạy cả chuỗi một phát, sang trang{" "}
            <Link href="/pipelines" className="text-foreground underline">
              Quy trình
            </Link>
            .
          </p>
        </div>
        <Link href="/pipelines">
          <Button type="button" size="sm">
            <Zap className="h-3.5 w-3.5" /> Chạy cả luồng ở Quy trình
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = categoryIcons[card.category] ?? Zap;
          return (
            <Card key={card.moduleNumber} data-testid="automation-card">
              <CardContent className="flex h-full flex-col gap-3 pt-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        Module {card.moduleNumber} · {card.title}
                      </span>
                      <Badge variant={categoryVariants[card.category] ?? "outline"}>
                        {categoryLabels[card.category] ?? card.category}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                  <Badge variant="outline">App-native · BYOK</Badge>
                  <Link href={card.href} className="ml-auto">
                    <Button type="button" size="sm">
                      Mở Module {card.moduleNumber}{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
