import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import type {
  CayTep,
  KetQuaKiemChung,
  MoiTruongDung,
  PhienXemTruoc,
} from "@/domain/dung-web/moi-truong-dung";

/**
 * Môi trường dựng chạy NGAY TRÊN MÁY, bằng tiến trình con.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CHỈ DÙNG KHI ANTIGRAVITY CHẠY TRÊN MÁY, KHÔNG DÙNG TRÊN VERCEL.
 * `taoMoiTruongMay()` tự từ chối nếu thấy biến `VERCEL` — xem ghi chú ở đó.
 *
 * VÌ SAO KHÔNG GHI VÀO TRONG KHO ANTIGRAVITY
 *
 * Vì `next dev` của chính Antigravity đang theo dõi thư mục kho. Ghi hàng nghìn
 * tệp `node_modules` vào đó là làm nó nạp lại liên tục, và tệ hơn: nó sẽ cố
 * biên dịch mã của dự án khách như thể là mã của mình. Nên không gian làm việc
 * nằm ở thư mục tạm của hệ điều hành, ngoài tầm theo dõi.
 *
 * VÌ SAO CÀI PHỤ THUỘC MỘT LẦN RỒI GIỮ
 *
 * `npm install` cho một dự án Next.js mất hàng phút. Nếu mỗi lần sửa một dòng
 * chữ lại cài lại thì không ai chờ nổi, và cảm giác "sửa là thấy ngay" mất sạch.
 * Nên `chuanBi()` chỉ cài khi CHƯA có `node_modules`; các lần sau chỉ ghi đè mã.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Tiến trình dev đang chạy, theo mã dự án. */
const dangChay = new Map<string, { tienTrinh: ChildProcess; cong: number }>();

/**
 * Dấu vết phiên xem trước GHI RA ĐĨA — không chỉ giữ trong bộ nhớ.
 *
 * ⚠️ LỖI THẬT, 12/09/2026: bấm "Tắt" mà máy chủ xem trước vẫn sống.
 *
 * Bản đầu chỉ nhớ tiến trình trong `Map` ở cấp mô-đun. Nhưng mô-đun này sống
 * trong tiến trình Next của Antigravity, và tiến trình đó NẠP LẠI MÃ mỗi lần
 * sửa tệp (`next dev`) — nạp lại là `Map` mới, rỗng. Người dùng bấm Tắt, tuyến
 * DELETE trả 200 vui vẻ, còn `next dev` của dự án khách vẫn giữ cổng mãi mãi.
 * Đo được: cổng 50557 vẫn LISTENING sau khi Tắt.
 *
 * Một tệp JSON nhỏ trong chính thư mục làm việc chữa cả hai chuyện: tìm lại
 * được tiến trình sau khi nạp lại mã, và không bật hai máy chủ cho cùng dự án.
 */
interface DauVetPhien {
  pid: number;
  cong: number;
  luc: string;
}

function tepPhien(thuMuc: string): string {
  return join(thuMuc, ".xem-truoc.json");
}

function ghiPhien(thuMuc: string, dau: DauVetPhien): void {
  try {
    writeFileSync(tepPhien(thuMuc), JSON.stringify(dau), "utf8");
  } catch {
    // Không ghi được thì vẫn chạy — chỉ mất khả năng tắt sau khi nạp lại mã.
  }
}

function xoaPhien(thuMuc: string): void {
  try {
    rmSync(tepPhien(thuMuc), { force: true });
  } catch {
    // thôi
  }
}

/** Dấu vết còn hiệu lực (tiến trình còn sống) hay không. */
function docPhien(thuMuc: string): DauVetPhien | null {
  try {
    const dau = JSON.parse(readFileSync(tepPhien(thuMuc), "utf8")) as DauVetPhien;
    if (!dau?.pid || !dau.cong) return null;
    // Tín hiệu 0 = "còn sống không?", không giết gì cả.
    process.kill(dau.pid, 0);
    return dau;
  } catch {
    return null;
  }
}

/**
 * Giết CẢ CÂY tiến trình, không chỉ tiến trình con trực tiếp.
 *
 * ⚠️ ĐÂY LÀ LỖI ĐÃ VẤP PHẢI THẬT, KHÔNG PHẢI PHÒNG XA.
 *
 * Vì `spawn` chạy với `shell: true` (bắt buộc trên Windows, do `npm` và `npx`
 * là tệp `.cmd` chứ không phải tệp thực thi), cái được đẻ ra là `cmd.exe`, còn
 * `next dev` là CHÁU chứ không phải con. `tienTrinh.kill()` giết đúng `cmd.exe`
 * và bỏ lại tiến trình Node vẫn đang giữ cổng.
 *
 * Hậu quả quan sát được: kịch bản thử chạy xong hết mọi bước rồi TREO — vì
 * tiến trình cháu còn sống thì vòng lặp sự kiện của Node không đóng. Nhìn từ
 * ngoài thì không phân biệt được với "đang chạy dở", nên rất dễ tưởng là chậm.
 *
 * `taskkill /T` đi hết cây con. Trên hệ khác thì giết theo nhóm tiến trình.
 */
function gietCaCay(pid: number | undefined, tienTrinh?: ChildProcess) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      // ⚠️ ĐỒNG BỘ, KHÔNG "bắn rồi quên". Bản đầu gọi `spawn("taskkill", …)`
      // rồi đi tiếp: taskkill hỏng (cây tiến trình đã đứt, hoặc từ chối
      // quyền) thì KHÔNG AI BIẾT, và máy chủ dev sống tiếp giữ cổng.
      //
      // `taskkill` là tệp .exe thật nên không cần shell — và không dùng shell
      // thì hết cảnh báo DEP0190 của Node về tham số không được thoát ký tự.
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      // Dấu trừ = giết cả nhóm tiến trình, không chỉ mình nó.
      process.kill(-pid, "SIGTERM");
    }
  } catch {
    // Đã chết rồi, hoặc không giết được — thử nốt cách thường ở dưới.
  }
  try {
    tienTrinh?.kill();
  } catch {
    // như trên
  }
}

/**
 * Giết mọi tiến trình con khi Antigravity thoát.
 *
 * ⚠️ THIẾU ĐOẠN NÀY LÀ ĐỂ LẠI TIẾN TRÌNH MỒ CÔI. Chúng vẫn giữ cổng, vẫn ăn
 * RAM, và không cửa sổ nào để tắt — người dùng chỉ thấy máy chậm dần sau vài
 * ngày mà không hiểu vì sao. Lỗi kiểu đó rất khó lần ra nguồn.
 */
let daGanDonDep = false;
function ganDonDep() {
  if (daGanDonDep) return;
  daGanDonDep = true;
  const giet = () => {
    for (const { tienTrinh } of dangChay.values()) gietCaCay(tienTrinh.pid, tienTrinh);
    dangChay.clear();
  };
  process.once("exit", giet);
  process.once("SIGINT", giet);
  process.once("SIGTERM", giet);
}

/** Xin hệ điều hành một cổng còn trống. */
function xinCongTrong(): Promise<number> {
  return new Promise((ok, hong) => {
    const may = createServer();
    may.once("error", hong);
    may.listen(0, () => {
      const dia = may.address();
      if (dia && typeof dia === "object") {
        const cong = dia.port;
        may.close(() => ok(cong));
      } else {
        may.close(() => hong(new Error("Không lấy được cổng trống")));
      }
    });
  });
}

/**
 * Đường dẫn tới tệp JS thật của một công cụ trong `node_modules` của dự án.
 *
 * ⚠️ GỌI THẲNG TỆP JS, KHÔNG QUA `npx`, KHÔNG DÙNG `shell: true`.
 *
 * Đây là bài học phải trả giá mới có. Bản đầu chạy `npx next dev` với
 * `shell: true`, nên chuỗi tiến trình là cmd.exe → npx → next dev. Khi đóng
 * phiên, `kill()` giết được cmd.exe, còn `next dev` là CHÁU nên sống sót và
 * giữ nguyên cổng.
 *
 * Vá lần hai bằng `taskkill /T` — vẫn không ăn, vì cmd.exe đã thoát từ trước
 * nên cây tiến trình đứt và `/T` không còn con nào để đi theo. Đo thật sau khi
 * kịch bản kết thúc: vẫn còn BA tiến trình Node sống trong thư mục làm việc.
 *
 * Cách chữa đúng không phải giết khéo hơn, mà là ĐỪNG ĐẺ RA CÂY. Gọi thẳng
 * `node <tệp.js>` thì `tienTrinh.pid` CHÍNH LÀ tiến trình cần giết, và `kill()`
 * đủ. Không shell, không cháu, không mồ côi.
 *
 * Phụ thêm: hết luôn cảnh báo DEP0190 của Node về truyền tham số qua shell.
 */
function tepCongCu(thuMuc: string, ...phan: string[]): string {
  return join(thuMuc, "node_modules", ...phan);
}

function chayLenh(
  tepJs: string,
  thamSo: string[],
  thuMuc: string,
  hanGiay = 600,
): Promise<{ ma: number | null; ra: string }> {
  return new Promise((ok) => {
    // Gọi thẳng bằng Node — xem ghi chú ở `tepCongCu`.
    const tt = spawn(process.execPath, [tepJs, ...thamSo], { cwd: thuMuc });
    let ra = "";
    const gom = (d: Buffer) => {
      ra += d.toString();
      // Chặn trần bộ nhớ: một lệnh hỏng có thể phun ra hàng chục MB.
      if (ra.length > 200_000) ra = ra.slice(-200_000);
    };
    tt.stdout?.on("data", gom);
    tt.stderr?.on("data", gom);
    const hen = setTimeout(() => {
      tt.kill();
      ra += `\n[quá ${hanGiay}s — đã dừng]`;
    }, hanGiay * 1000);
    tt.on("close", (ma) => {
      clearTimeout(hen);
      ok({ ma, ra });
    });
  });
}

export function taoMoiTruongMay(goc?: string): MoiTruongDung {
  // ⚠️ CHẶN TỪ ĐẦU, KHÔNG ĐỂ HỎNG GIỮA CHỪNG.
  //
  // Trên Vercel, `spawn` không lỗi ngay — nó chạy rồi mới hỏng ở bước ghi tệp
  // hoặc mở cổng, và thông báo lỗi lúc đó không nói gì về nguyên nhân thật.
  // Từ chối ngay tại đây thì thông điệp còn chỉ đúng chỗ.
  if (process.env.VERCEL) {
    throw new Error(
      "MoiTruongMay không chạy được trên Vercel (hệ thống tệp chỉ đọc, " +
        "hàm giới hạn 60 giây). Dùng MoiTruongSandbox.",
    );
  }
  ganDonDep();

  const thuMucGoc = goc ?? join(tmpdir(), "antigravity-dung-web");
  const noiLam = (maDuAn: string) => join(thuMucGoc, maDuAn);

  return {
    ten: "máy",

    async chuanBi(maDuAn, cay: CayTep) {
      const thuMuc = noiLam(maDuAn);
      await mkdir(thuMuc, { recursive: true });

      for (const tep of cay.tep) {
        // Chặn thoát khỏi thư mục làm việc. Mã do mô hình sinh ra là dữ liệu
        // không tin được: một đường dẫn `../../..` sẽ ghi đè tệp thật của máy.
        // ⚠️ SO BẰNG `relative`, KHÔNG BẰNG `startsWith`.
        //
        // `startsWith` so tiền tố CHUỖI, nên thư mục `du-an-2` khớp nhầm với
        // `du-an-22`: một dự án ghi được đè lên dự án khác chỉ vì tên nó là
        // tiền tố. Lỗi này không lộ ra khi thử tay — nó cần đúng hai tên dự án
        // trong đó tên này là tiền tố của tên kia.
        //
        // `relative()` trả về đường đi thật giữa hai thư mục: bắt đầu bằng
        // `..` nghĩa là đích nằm NGOÀI, và `isAbsolute` bắt trường hợp đường
        // dẫn tuyệt đối (khác ổ đĩa trên Windows).
        const nen = resolve(thuMuc);
        const dich = resolve(nen, tep.duongDan);
        const duongDi = relative(nen, dich);
        if (
          duongDi.startsWith("..") ||
          isAbsolute(duongDi) ||
          duongDi === ""
        ) {
          throw new Error(`Đường dẫn thoát khỏi thư mục làm việc: ${tep.duongDan}`);
        }
        await mkdir(dirname(dich), { recursive: true });
        await writeFile(dich, tep.noiDung, "utf8");
      }

      if (!existsSync(join(thuMuc, "node_modules"))) {
        // npm là ngoại lệ DUY NHẤT còn qua shell: nó nằm NGOÀI `node_modules`
        // của dự án (lúc này chưa có gì cả), và trên Windows là tệp `.cmd`.
        // Chấp nhận được vì đây là lệnh chạy-một-lần-rồi-thoát, không phải
        // tiến trình sống lâu — nên không có chuyện để lại tiến trình mồ côi.
        const { ma, ra } = await new Promise<{ ma: number | null; ra: string }>(
          (ok) => {
            const tt = spawn("npm", ["install", "--no-audit", "--no-fund"], {
              cwd: thuMuc,
              shell: true,
            });
            let gop = "";
            const gom = (d: Buffer) => {
              gop += d.toString();
              if (gop.length > 200_000) gop = gop.slice(-200_000);
            };
            tt.stdout?.on("data", gom);
            tt.stderr?.on("data", gom);
            tt.on("close", (ma) => ok({ ma, ra: gop }));
          },
        );
        if (ma !== 0) throw new Error(`npm install hỏng:\n${ra.slice(-4000)}`);
      }
    },

    async kiemChung(maDuAn): Promise<KetQuaKiemChung> {
      const thuMuc = noiLam(maDuAn);
      const batDau = Date.now();

      // ⚠️ DỌN `.next` TRƯỚC KHI DỰNG. Lỗi thật, 12/09/2026.
      //
      // Mở xem trước (`next dev`) rồi dựng lại: `next build` chết ở bước kiểm
      // kiểu với "File '.next/dev/types/routes.d.ts' is not a module". Vì
      // `next dev` để lại thư mục kiểu của chế độ dev, còn `next build` thì tự
      // THÊM `.next/dev/types/**/*.ts` vào `tsconfig.json` của dự án rồi kiểm
      // luôn đống tệp cũ đó.
      //
      // Nhìn từ ngoài thì y như mã sinh ra bị hỏng — mà mã không đổi một dòng;
      // chỉ khác là lần này chạy sau một phiên xem trước. Dựng sạch thì hết,
      // và đắt thêm vài giây chứ không đắt thêm một vòng sửa nhầm chỗ.
      await rm(join(thuMuc, ".next"), { recursive: true, force: true });

      // Chạy tsc TRƯỚC next build, và dừng ngay nếu hỏng.
      //
      // Không phải để nhanh hơn — mà vì lỗi kiểu dữ liệu của tsc chỉ đúng một
      // dòng và đọc được, còn cùng lỗi đó khi vỡ ra ở giữa `next build` thì
      // kèm theo cả đống vết ngăn xếp của bundler. Đưa cái thứ hai cho mô hình
      // sửa là bắt nó lội qua nhiễu để tìm lại đúng dòng tsc đã chỉ.
      const kiemKieu = await chayLenh(
        tepCongCu(thuMuc, "typescript", "bin", "tsc"),
        ["--noEmit"],
        thuMuc,
        300,
      );
      if (kiemKieu.ma !== 0) {
        return { dat: false, loi: kiemKieu.ra, mili: Date.now() - batDau };
      }

      const dung = await chayLenh(
        tepCongCu(thuMuc, "next", "dist", "bin", "next"),
        ["build"],
        thuMuc,
        600,
      );
      return {
        dat: dung.ma === 0,
        loi: dung.ma === 0 ? undefined : dung.ra,
        mili: Date.now() - batDau,
      };
    },

    async moXemTruoc(maDuAn): Promise<PhienXemTruoc> {
      const thuMuc = noiLam(maDuAn);

      const dangCo = dangChay.get(maDuAn);
      if (dangCo) {
        return {
          url: `http://localhost:${dangCo.cong}`,
          dong: async () => {
            gietCaCay(dangCo.tienTrinh.pid, dangCo.tienTrinh);
            dangChay.delete(maDuAn);
            xoaPhien(thuMuc);
          },
        };
      }

      // Không có trong bộ nhớ nhưng có dấu vết trên đĩa: tiến trình của lần
      // chạy TRƯỚC KHI NẠP LẠI MÃ vẫn sống. Dùng lại nó thay vì bật thêm một
      // cái nữa — hai `next dev` cùng thư mục `.next` là cả hai cùng hỏng.
      const cu = docPhien(thuMuc);
      if (cu) {
        return {
          url: `http://localhost:${cu.cong}`,
          dong: async () => {
            gietCaCay(cu.pid);
            xoaPhien(thuMuc);
          },
        };
      }

      const cong = await xinCongTrong();
      const tienTrinh = spawn(
        process.execPath,
        [tepCongCu(thuMuc, "next", "dist", "bin", "next"), "dev", "--port", String(cong)],
        { cwd: thuMuc },
      );
      dangChay.set(maDuAn, { tienTrinh, cong });
      ghiPhien(thuMuc, { pid: tienTrinh.pid ?? 0, cong, luc: new Date().toISOString() });
      tienTrinh.on("close", () => {
        dangChay.delete(maDuAn);
        xoaPhien(thuMuc);
      });

      // ⚠️ PHẢI BẮT ĐẦU RA CỦA DEV SERVER, dù không hiển thị lúc chạy êm.
      //
      // Bản đầu bỏ qua stdout/stderr, và khi máy chủ không lên thì thông báo
      // duy nhất là "không lên sau 120 giây" — không nói vì sao. Thực tế lúc
      // đó Next đang báo rõ nguyên nhân (một tiến trình dev khác đang giữ cùng
      // thư mục `.next`), nhưng lời báo đó rơi vào hư không.
      //
      // Một lỗi có nguyên nhân rõ mà bị nuốt mất thì tốn nhiều thời gian hơn
      // hẳn một lỗi không có nguyên nhân.
      let nhatKy = "";
      const gomNhatKy = (d: Buffer) => {
        nhatKy += d.toString();
        if (nhatKy.length > 20_000) nhatKy = nhatKy.slice(-20_000);
      };
      tienTrinh.stdout?.on("data", gomNhatKy);
      tienTrinh.stderr?.on("data", gomNhatKy);
      tienTrinh.on("error", (loi) => {
        nhatKy += `
[không chạy được: ${loi.message}]`;
      });

      // Chờ máy chủ THẬT SỰ trả lời, không chỉ chờ dòng chữ "Ready".
      //
      // Next in "Ready" khi đã mở cổng, nhưng tuyến đầu tiên còn phải biên dịch
      // theo yêu cầu — nên mở iframe ngay lúc đó vẫn có thể trắng trang. Gõ
      // cửa thật cho tới khi có phản hồi thì chắc hơn.
      const hanChot = Date.now() + 120_000;
      let loiCuoi = "";
      while (Date.now() < hanChot) {
        try {
          const dap = await fetch(`http://localhost:${cong}/`, {
            signal: AbortSignal.timeout(5000),
          });
          if (dap.ok || dap.status < 500) break;
          loiCuoi = `HTTP ${dap.status}`;
        } catch (loi) {
          loiCuoi = loi instanceof Error ? loi.message : String(loi);
        }
        await new Promise((r) => setTimeout(r, 700));
      }
      if (Date.now() >= hanChot) {
        gietCaCay(tienTrinh.pid, tienTrinh);
        dangChay.delete(maDuAn);
        xoaPhien(thuMuc);
        throw new Error(
          `Máy chủ dev không lên sau 120 giây (${loiCuoi})
` +
            `Nhật ký Next:
${nhatKy.slice(-4000) || "(không có đầu ra)"}`,
        );
      }

      return {
        url: `http://localhost:${cong}`,
        dong: async () => {
          gietCaCay(tienTrinh.pid, tienTrinh);
          dangChay.delete(maDuAn);
          xoaPhien(thuMuc);
        },
      };
    },

    dangXemTruoc(maDuAn) {
      const dangCo = dangChay.get(maDuAn);
      if (dangCo) return `http://localhost:${dangCo.cong}`;
      const cu = docPhien(noiLam(maDuAn));
      return cu ? `http://localhost:${cu.cong}` : null;
    },

    async dongXemTruoc(maDuAn) {
      const thuMuc = noiLam(maDuAn);
      const dangCo = dangChay.get(maDuAn);
      const cu = docPhien(thuMuc);
      if (!dangCo && !cu) return false;
      // Giết theo CẢ HAI nguồn: bộ nhớ có thể trống sau khi nạp lại mã, dấu
      // vết trên đĩa có thể cũ nếu ai đó giết tay.
      if (dangCo) gietCaCay(dangCo.tienTrinh.pid, dangCo.tienTrinh);
      if (cu && cu.pid !== dangCo?.tienTrinh.pid) gietCaCay(cu.pid);
      dangChay.delete(maDuAn);
      xoaPhien(thuMuc);
      return true;
    },

    async don(maDuAn) {
      await this.dongXemTruoc(maDuAn);
      await rm(noiLam(maDuAn), { recursive: true, force: true });
    },
  };
}
