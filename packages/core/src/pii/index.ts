/**
 * EPOG-M: PII + Secret Scanner
 * 
 * Deterministic, regex-based detection of credentials, PII, and sensitive data.
 * All patterns are ordered by specificity — more specific patterns are evaluated first.
 * Masking is reversible within the same session via a secure token map.
 */

export type PIICategory =
  | "api-key"
  | "aws-credential"
  | "github-token"
  | "jwt"
  | "private-key"
  | "password"
  | "database-url"
  | "bearer-token"
  | "internal-url"
  | "email"
  | "phone"
  | "credit-card"
  | "ssn"
  | "npm-token"
  | "stripe-key"
  | "openai-key"
  | "generic-secret";

export interface PIIDetection {
  category: PIICategory;
  name: string;
  match: string;
  startIndex: number;
  endIndex: number;
  maskToken: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface PIIScanResult {
  originalText: string;
  maskedText: string;
  detections: PIIDetection[];
  maskMap: Map<string, string>; // token → original value (session-only, never persisted)
  riskLevel: "clean" | "low" | "medium" | "high" | "critical";
  hasCriticalData: boolean;
}

interface PIIPattern {
  name: string;
  category: PIICategory;
  pattern: RegExp;
  severity: PIIDetection["severity"];
}

// Ordered: most critical first so masking doesn't interfere with later patterns
const PII_PATTERNS: PIIPattern[] = [
  {
    name: "Private Key (RSA/EC/Generic)",
    category: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
  },
  {
    name: "OpenAI API Key",
    category: "openai-key",
    pattern: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/g,
    severity: "critical",
  },
  {
    name: "Stripe Secret Key",
    category: "stripe-key",
    pattern: /sk_(?:live|test)_[A-Za-z0-9]{24,}/g,
    severity: "critical",
  },
  {
    name: "AWS Access Key ID",
    category: "aws-credential",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
  },
  {
    name: "GitHub Personal Access Token",
    category: "github-token",
    pattern: /\bghp_[A-Za-z0-9]{36}\b/g,
    severity: "critical",
  },
  {
    name: "NPM Token",
    category: "npm-token",
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/g,
    severity: "critical",
  },
  {
    name: "JWT Token",
    category: "jwt",
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: "high",
  },
  {
    name: "Bearer Token",
    category: "bearer-token",
    pattern: /\bBearer\s+([A-Za-z0-9\-_.]{20,})\b/g,
    severity: "high",
  },
  {
    name: "Database Connection URL",
    category: "database-url",
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|mariadb):\/\/[^\s"'`\]>]+/gi,
    severity: "critical",
  },
  {
    name: "Generic API Key (Assignment)",
    category: "api-key",
    pattern: /(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|client[_-]?secret)\s*[=:]\s*["']?([A-Za-z0-9_\-]{20,})["']?/gi,
    severity: "critical",
  },
  {
    name: "Password (Assignment)",
    category: "password",
    pattern: /(?:password|passwd|pwd|secret)\s*[=:]\s*["']([^"'\s]{4,})["']/gi,
    severity: "high",
  },
  {
    name: "Internal / Private Network URL",
    category: "internal-url",
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})[^\s"'`]*/gi,
    severity: "medium",
  },
  {
    name: "Credit Card Number",
    category: "credit-card",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    severity: "critical",
  },
  {
    name: "US Social Security Number",
    category: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: "critical",
  },
  {
    name: "Email Address",
    category: "email",
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    severity: "low",
  },
  {
    name: "US Phone Number",
    category: "phone",
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    severity: "low",
  },
];

const SEVERITY_ORDER: Record<PIIDetection["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

let _maskCounter = 0;

function generateMaskToken(category: PIICategory): string {
  _maskCounter++;
  return `[REDACTED:${category.toUpperCase()}:${_maskCounter}]`;
}

export class PIIScanner {
  /** Reset mask counter — call at the start of each new session. */
  resetSession(): void {
    _maskCounter = 0;
  }

  scan(text: string): PIIScanResult {
    const detections: PIIDetection[] = [];
    const maskMap = new Map<string, string>();
    let maskedText = text;

    // Run patterns in definition order (most critical first).
    // We work on the already-masked text so prior masks are not re-detected.
    for (const piiPattern of PII_PATTERNS) {
      const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
      const matches = Array.from(maskedText.matchAll(regex));

      for (const match of matches) {
        const fullMatch = match[0];
        const startIndex = match.index ?? 0;
        const maskToken = generateMaskToken(piiPattern.category);

        detections.push({
          category: piiPattern.category,
          name: piiPattern.name,
          match: fullMatch,
          startIndex,
          endIndex: startIndex + fullMatch.length,
          maskToken,
          severity: piiPattern.severity,
        });

        maskMap.set(maskToken, fullMatch);
        maskedText = maskedText.slice(0, startIndex) + maskToken + maskedText.slice(startIndex + fullMatch.length);
      }
    }

    const maxSeverityLevel = detections.reduce((max, d) => {
      return SEVERITY_ORDER[d.severity] > SEVERITY_ORDER[max] ? d.severity : max;
    }, "low" as PIIDetection["severity"]);

    const riskLevel: PIIScanResult["riskLevel"] = detections.length === 0
      ? "clean"
      : maxSeverityLevel;

    return {
      originalText: text,
      maskedText,
      detections,
      maskMap,
      riskLevel,
      hasCriticalData: detections.some(d => d.severity === "critical"),
    };
  }

  /** Restore original values from a masked string using the session mask map. */
  unmask(maskedText: string, maskMap: Map<string, string>): string {
    let result = maskedText;
    for (const [token, original] of maskMap.entries()) {
      result = result.replaceAll(token, original);
    }
    return result;
  }
}
