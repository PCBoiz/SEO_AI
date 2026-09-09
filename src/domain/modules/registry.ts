import { registerModuleDefinition } from "@/domain/modules/module-definition";
import { sitemapKeywordsModule } from "@/domain/modules/definitions/sitemap-keywords";
import {
  icnKeywordsModule,
  importedKeywordsModule,
  onPageSeoModule,
} from "@/domain/modules/definitions/research-modules";
import {
  headlineModule,
  homepageModule,
  introModule,
  sectionsModule,
} from "@/domain/modules/definitions/content-modules";
import { geoSchemaModule } from "@/domain/modules/definitions/geo-schema";
import { geoFilesModule } from "@/domain/modules/definitions/geo-files";
import { wordpressPublishModule } from "@/domain/modules/definitions/wordpress-publish";
import {
  facebookPublishModule,
  gbpPublishModule,
  zaloPublishModule,
} from "@/domain/modules/definitions/social-publish";
import { videoScriptModule } from "@/domain/modules/definitions/video-script";
import { repurposeModule } from "@/domain/modules/definitions/repurpose";
import { abVariantsModule } from "@/domain/modules/definitions/ab-variants";
import { siteScanModule } from "@/domain/modules/definitions/site-scan";
import { vinhomesPublishModule } from "@/domain/modules/definitions/vinhomes-publish";

// Đăng ký tất cả module app-native tại một chỗ. Import file này để đảm bảo
// registry đã nạp trước khi engine/route tra cứu theo moduleKey.
// Module 1 (Sitemap) vẫn chạy trên đường app-native riêng đã kiểm chứng; các
// module từ #2 trở đi dùng engine chung này. Module #12 (Publish WordPress+FB)
// khác bản chất (tích hợp nền tảng ngoài) nên làm ở giai đoạn sau.
registerModuleDefinition(sitemapKeywordsModule);
registerModuleDefinition(icnKeywordsModule);
registerModuleDefinition(importedKeywordsModule);
registerModuleDefinition(onPageSeoModule);
registerModuleDefinition(homepageModule);
registerModuleDefinition(headlineModule);
registerModuleDefinition(introModule);
registerModuleDefinition(sectionsModule);
registerModuleDefinition(geoSchemaModule);
registerModuleDefinition(wordpressPublishModule);
registerModuleDefinition(geoFilesModule);
registerModuleDefinition(facebookPublishModule);
registerModuleDefinition(zaloPublishModule);
registerModuleDefinition(gbpPublishModule);
registerModuleDefinition(videoScriptModule);
registerModuleDefinition(repurposeModule);
registerModuleDefinition(abVariantsModule);
registerModuleDefinition(siteScanModule);
registerModuleDefinition(vinhomesPublishModule);

export const registeredModuleKeys = [
  sitemapKeywordsModule.key,
  icnKeywordsModule.key,
  importedKeywordsModule.key,
  onPageSeoModule.key,
  homepageModule.key,
  headlineModule.key,
  introModule.key,
  sectionsModule.key,
  geoSchemaModule.key,
  wordpressPublishModule.key,
  geoFilesModule.key,
  facebookPublishModule.key,
  zaloPublishModule.key,
  gbpPublishModule.key,
  videoScriptModule.key,
  repurposeModule.key,
  abVariantsModule.key,
  // ⚠️ HAI DÒNG NÀY TỪNG THIẾU, VÀ THIẾU ÂM THẦM.
  //
  // Cả hai đều được `registerModuleDefinition` ở trên nên chúng CHẠY BÌNH THƯỜNG
  // — mảng này không dùng lúc chạy, chỉ dùng để liệt kê và báo cáo. Nên khi
  // thiếu, không có gì hỏng: chỉ có mọi chỗ đếm module là đếm hụt hai cái.
  //
  // Đã đo hậu quả: `scripts/bao-cao-du-an.mjs` báo 17 module trong khi kho có 19.
  // Một con số sai trong báo cáo trạng thái thì không ai kiểm lại được bằng cách
  // dùng thử — nó chỉ sai trên giấy, và sai mãi.
  //
  // Test `registeredModuleKeys phải phủ hết registry` khoá lại chuyện này.
  siteScanModule.key,
  vinhomesPublishModule.key,
] as const;

// Thứ tự pipeline "chuỗi bài viết cho 1 chủ đề" (chạy-chung 1 phát). Mỗi bước tự
// dùng đầu ra các bước trước qua ngữ cảnh upstream. #4 (Imported) và #6 (Home)
// bỏ khỏi chuỗi bài viết vì thuộc luồng khác; #1 Sitemap là cấp site.
export const articlePipelineModuleKeys = [
  sitemapKeywordsModule.key, // #2 từ khóa
  icnKeywordsModule.key, // #3 ICN
  onPageSeoModule.key, // #5 On-Page
  headlineModule.key, // #7 tiêu đề
  introModule.key, // #8 mở đầu
  sectionsModule.key, // #10 thân bài
  geoSchemaModule.key, // #11 FAQ + JSON-LD
  geoFilesModule.key, // #13 llms.txt + sitemap + robots + hướng dẫn
] as const;

// Luồng dựng sẵn để người dùng chọn ở trang Quy trình (không khoá cứng 1 luồng).
export interface PipelinePreset {
  id: string;
  name: string;
  description: string;
  moduleKeys: readonly string[];
}

export const pipelinePresets: PipelinePreset[] = [
  {
    id: "article",
    name: "Chuỗi bài viết SEO + GEO",
    description: "Từ khóa → nội dung → GEO (llms.txt / sitemap / robots).",
    moduleKeys: articlePipelineModuleKeys,
  },
  {
    id: "article_video",
    name: "Bài viết + Video",
    description: "Chuỗi bài viết rồi tạo gói video từ chính bài đó.",
    moduleKeys: [...articlePipelineModuleKeys, videoScriptModule.key],
  },
  {
    id: "article_repurpose",
    name: "Bài viết + Tái chế đa nền tảng",
    description:
      "Chuỗi bài viết rồi tái chế thành thread / carousel / newsletter / caption FB.",
    moduleKeys: [...articlePipelineModuleKeys, repurposeModule.key],
  },
  {
    id: "full",
    name: "Trọn gói (bài viết + video + tái chế)",
    description: "Toàn bộ: nội dung + GEO + video + tái chế đa nền tảng.",
    moduleKeys: [
      ...articlePipelineModuleKeys,
      videoScriptModule.key,
      repurposeModule.key,
    ],
  },
  {
    // ⚠️ LUỒNG DUY NHẤT CÓ BƯỚC ĐĂNG BÀI. ĐỌC TRƯỚC KHI SỬA.
    //
    // Bốn luồng phía trên đều KẾT THÚC ở `geoFilesModule` — tức là chúng sinh
    // ra bài viết, FAQ, JSON-LD, llms.txt… rồi dừng. Người dùng vẫn phải tự mở
    // module đăng bài và bấm riêng.
    //
    // Với một hệ tự xưng là "tự động hoá đăng bài" thì đó là mắt xích thiếu:
    // chạy trọn gói xong vẫn còn hai lần bấm tay (đăng ở đây, rồi duyệt bên
    // site) cho mỗi bài.
    //
    // VÌ SAO NỐI VÀO ĐƯỢC MÀ KHÔNG SỢ: cả ba trường nhập của module đăng bài
    // đều có giá trị mặc định — `title` rỗng thì lấy tiêu đề từ module trước,
    // `chuyenMuc` mặc định "Thị trường", `ngayDang` rỗng thì lấy hôm nay. Nên
    // nó chạy được không cần ai điền gì.
    //
    // VÀ VÌ SAO ĐĂNG TỰ ĐỘNG VẪN AN TOÀN: site đích lưu bài với trạng thái
    // `"cho"` (chờ duyệt). Bài KHÔNG hiện ra cho khách cho tới khi một CON
    // NGƯỜI mở `/duyet-bai`, đọc lại và bấm duyệt. Hàng rào đó nằm bên site và
    // không luồng nào ở đây vượt qua được.
    //
    // KHÔNG thêm bước này vào luồng "Trọn gói" ở trên: tên của nó nói rõ nó
    // gồm những gì, và đổi việc một cái tên đã hứa là cách làm người dùng mất
    // lòng tin vào mọi cái tên còn lại.
    id: "article_publish",
    name: "Chuỗi bài viết → đẩy thẳng sang site",
    description:
      "Từ khóa → nội dung → GEO → đẩy sang site, vào hàng chờ duyệt. Bài chỉ hiện ra sau khi bạn duyệt.",
    moduleKeys: [...articlePipelineModuleKeys, vinhomesPublishModule.key],
  },
];
