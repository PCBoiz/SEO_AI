export const oauthProviderIds = ["google", "make"] as const;
export type OAuthProviderId = (typeof oauthProviderIds)[number];

export const oauthIntents = ["login", "link", "connect"] as const;
export type OAuthIntent = (typeof oauthIntents)[number];

export interface OAuthConnectionSummary {
  provider: OAuthProviderId;
  configured: boolean;
  automationConfigured: boolean;
  linkedForLogin: boolean;
  connectedForAutomation: boolean;
  accountLabel?: string;
  scopes: string[];
  status?: "active" | "expired" | "revoked" | "error";
  expiresAt?: string;
}
