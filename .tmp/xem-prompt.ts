import { seoGeoPreamble, dongHomNay } from "@/domain/modules/seo-geo";
console.log("── dòng HÔM NAY ──");
console.log(dongHomNay());
console.log("\n── luật 5 ──");
const p = seoGeoPreamble();
const i = p.indexOf("5. KHÔNG TỰ SUY RA");
console.log(p.slice(i, i + 420));
