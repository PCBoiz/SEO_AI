import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { ConfigurationError, ValidationError } from "@/domain/shared/app-error";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PAYLOAD_VERSION = "v1";

export class Vault {
  private readonly key: Buffer;

  constructor(encodedKey: string) {
    this.key = decodeKey(encodedKey);
  }

  encrypt(plaintext: string, additionalAuthenticatedData?: string): string {
    if (!plaintext) {
      throw new ValidationError(
        "EMPTY_VAULT_PLAINTEXT",
        "Vault plaintext must not be empty.",
      );
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    if (additionalAuthenticatedData) {
      cipher.setAAD(Buffer.from(additionalAuthenticatedData, "utf8"));
    }

    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      PAYLOAD_VERSION,
      iv.toString("base64url"),
      tag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":");
  }

  decrypt(payload: string, additionalAuthenticatedData?: string): string {
    const [version, encodedIv, encodedTag, encodedCiphertext, ...rest] =
      payload.split(":");

    if (
      version !== PAYLOAD_VERSION ||
      !encodedIv ||
      !encodedTag ||
      !encodedCiphertext ||
      rest.length > 0
    ) {
      throw new ValidationError(
        "INVALID_VAULT_PAYLOAD",
        "Encrypted payload format is invalid.",
      );
    }

    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      throw new ValidationError(
        "INVALID_VAULT_PAYLOAD",
        "Encrypted payload metadata is invalid.",
      );
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      if (additionalAuthenticatedData) {
        decipher.setAAD(Buffer.from(additionalAuthenticatedData, "utf8"));
      }
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch (cause) {
      throw new ValidationError(
        "VAULT_DECRYPTION_FAILED",
        "Encrypted data could not be authenticated.",
        { causeType: cause instanceof Error ? cause.name : "unknown" },
      );
    }
  }
}

function decodeKey(encodedKey: string): Buffer {
  const trimmed = encodedKey.trim();
  let key: Buffer;

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else {
    try {
      key = Buffer.from(trimmed, "base64");
    } catch {
      throw new ConfigurationError(
        "INVALID_VAULT_KEY",
        "VAULT_ENCRYPTION_KEY must encode exactly 32 bytes.",
      );
    }
  }

  if (key.length !== 32) {
    throw new ConfigurationError(
      "INVALID_VAULT_KEY",
      "VAULT_ENCRYPTION_KEY must encode exactly 32 bytes.",
    );
  }

  return key;
}
