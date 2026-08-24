"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField
        label="Email"
        htmlFor="login-email"
        error={state.fieldErrors?.email?.[0]}
        required
      >
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="owner@local.antigravity"
          required
        />
      </FormField>
      <FormField
        label="Mật khẩu"
        htmlFor="login-password"
        error={state.fieldErrors?.password?.[0]}
        required
      >
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      {state.message && (
        <p className="text-xs text-destructive" aria-live="polite">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        Đăng nhập
      </Button>
    </form>
  );
}
