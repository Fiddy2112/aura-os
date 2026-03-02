export class Sanitizer {
  // Regex to match 64-char hex strings (common Private Key format)
  // Also matches with or without 0x prefix
  private static readonly PRIVATE_KEY_REGEX = /\b(0x)?[a-fA-F0-0]{64}\b/g;
  
  // Regex to match Sui private keys (bech32-like starting with suiprivkey)
  private static readonly SUI_KEY_REGEX = /suiprivkey[a-zA-Z0-9]+/g;

  /**
   * Redacts sensitive crypto information from strings or objects
   */
  static sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (data !== null && typeof data === 'object') {
      const sanitizedObj: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Redact any field that sounds sensitive by name
        const sensitiveKeys = ['password', 'privatekey', 'secret', 'key', 'seed', 'mnemonic'];
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          sanitizedObj[key] = '[REDACTED_SENSITIVE_FIELD]';
        } else {
          sanitizedObj[key] = this.sanitize(value);
        }
      }
      return sanitizedObj;
    }

    return data;
  }

  private static sanitizeString(str: string): string {
    let sanitized = str;
    
    // 1. Redact Hex Private Keys
    sanitized = sanitized.replace(this.PRIVATE_KEY_REGEX, (match) => {
      return `${match.slice(0, 4)}...[REDACTED_PRIVATE_KEY]...${match.slice(-4)}`;
    });

    // 2. Redact Sui Private Keys
    sanitized = sanitized.replace(this.SUI_KEY_REGEX, '[REDACTED_SUI_KEY]');

    return sanitized;
  }
}
