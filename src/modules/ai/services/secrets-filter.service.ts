export class SecretsFilterService {
  /**
   * Common patterns for secrets, API keys, and tokens.
   * This is a heuristic safety net, not a perfect scanner.
   */
  private static SECRET_PATTERNS = [
    // AWS Access Key ID
    /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    // Generic tokens (Bearer, Basic, API Key, Secret)
    /(?:api[_\-]?key|secret|token|password|auth|access[_\-]?token)["'\s:=]+(["'][a-zA-Z0-9\-_]{16,}["'])/gi,
    // RSA private keys
    /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
    // Generic high-entropy hex strings that might be secrets (length >= 32)
    // Disabled by default to prevent over-redaction of git SHAs and hashes
    // /\b[a-f0-9]{32,}\b/g,
    
    // JWT Tokens (heuristic: eyJ...)
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    
    // GitHub Personal Access Token
    /gh[pousr]_[a-zA-Z0-9]{36}/g,
    
    // Slack Token
    /xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/g,
    
    // Stripe Standard/Restricted API Keys
    /(?:sk|rk)_live_[0-9a-zA-Z]{24}/g,
    
    // Google Cloud API Key
    /AIza[0-9A-Za-z\\-_]{35}/g
  ];

  /**
   * Scans text for likely secrets and replaces them with a redacted placeholder.
   */
  static filter(text: string): string {
    if (!text) return text;
    
    let filteredText = text;
    for (const pattern of this.SECRET_PATTERNS) {
      filteredText = filteredText.replace(pattern, (match, group1) => {
        // If the pattern uses a capture group (like the generic token one), 
        // we only replace the captured value part to preserve context
        if (group1) {
          return match.replace(group1, '"[REDACTED_SECRET]"');
        }
        return "[REDACTED_SECRET]";
      });
    }

    return filteredText;
  }
}
