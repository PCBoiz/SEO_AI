"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteErrorProps {
  error: Error & { digest?: string };
  unstableRetry: () => void;
  title: string;
  description: string;
}

export function RouteError({
  error,
  unstableRetry,
  title,
  description,
}: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">
              Mã đối chiếu log: {error.digest}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => unstableRetry()}>
              Thử tải lại
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Về Tổng quan
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
