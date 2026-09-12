"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Thẻ "GitHub — đẩy web khách" ở Cài đặt.
 *
 * Token này dán được ngay trong thẻ "Website dựng sẵn" của từng dự án; thẻ ở
 * đây để người dùng biết nó ĐANG có (tài khoản nào, lưu lúc nào), gỡ hoặc thay
 * mà không phải mở một dự án ra tìm. Token không bao giờ hiện lại — chỉ tên
 * tài khoản.
 */
export function KetNoiGitHub({
  banDau,
  canManage,
}: {
  banDau: { login: string; luuLuc: string } | null;
  canManage: boolean;
}) {
  const [ketNoi, setKetNoi] = useState(banDau);
  const [token, setToken] = useState("");
  const [dangLam, setDangLam] = useState(false);
  const [loi, setLoi] = useState<string>();

  async function luu(): Promise<void> {
    setLoi(undefined);
    setDangLam(true);
    try {
      const r = await fetch("/api/v1/github/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = (await r.json().catch(() => ({}))) as { ketNoi?: { login: string; luuLuc: string }; error?: { message?: string } };
      if (!r.ok || !d.ketNoi) throw new Error(d.error?.message ?? `Máy chủ trả HTTP ${r.status}`);
      setKetNoi(d.ketNoi);
      setToken("");
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được token.");
    } finally {
      setDangLam(false);
    }
  }

  async function go(): Promise<void> {
    setDangLam(true);
    try {
      await fetch("/api/v1/github/token", { method: "DELETE" });
      setKetNoi(null);
    } finally {
      setDangLam(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> GitHub — đẩy web khách lên mạng
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          Website dựng cho khách được đẩy lên một kho GitHub riêng tư của bạn; Cloudflare nối với kho đó tự dựng
          và đưa lên mạng. Token là <em>Personal access token</em> (fine-grained; quyền Contents và
          Administration: Read and write, cho “All repositories”). Được mã hoá, không hiện lại.
        </p>
        {ketNoi ? (
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Đang nối với tài khoản <strong className="text-foreground">{ketNoi.login}</strong> — lưu lúc{" "}
              {new Date(ketNoi.luuLuc).toLocaleString("vi-VN")}.
            </span>
            {canManage && (
              <Button type="button" size="sm" variant="ghost" onClick={() => void go()} disabled={dangLam}>
                Gỡ token
              </Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Chưa có token. Dán vào đây hoặc trong thẻ “Website dựng sẵn” của một dự án.</p>
        )}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={ketNoi ? "Dán token mới để thay" : "github_pat_…"}
              autoComplete="off"
              className="max-w-xs"
              aria-label="Token GitHub"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void luu()} disabled={dangLam || token.trim().length < 20}>
              {dangLam ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              {ketNoi ? "Thay token" : "Lưu token"}
            </Button>
          </div>
        )}
        {loi && (
          <p role="alert" className="text-xs text-destructive">
            {loi}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
