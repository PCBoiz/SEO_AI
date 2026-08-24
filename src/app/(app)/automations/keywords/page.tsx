import { redirect } from "next/navigation";

// Module 2 đã hợp nhất vào trang runner chung (cùng preset + lịch sử + ghim).
export default function KeywordsModulePage() {
  redirect("/automations/run/RIS_SITEMAP_KEYWORDS");
}
