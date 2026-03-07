export class Sanitizer {
  // Fix: was [a-fA-F0-0] (typo) → [a-fA-F0-9]
  private static readonly PRIVATE_KEY_REGEX = /\b(0x)?[a-fA-F0-9]{64}\b/g;
  private static readonly SUI_KEY_REGEX = /suiprivkey[a-zA-Z0-9]+/g;

  static sanitize(data: any): any {
    if (typeof data === 'string') return this.sanitizeString(data);
    if (Array.isArray(data))     return data.map(item => this.sanitize(item));

    if (data !== null && typeof data === 'object') {
      const sanitizedObj: any = {};
      const sensitiveKeys = ['password', 'privatekey', 'secret', 'key', 'seed', 'mnemonic'];

      for (const [k, v] of Object.entries(data)) {
        sanitizedObj[k] = sensitiveKeys.some(sk => k.toLowerCase().includes(sk))
          ? '[REDACTED_SENSITIVE_FIELD]'
          : this.sanitize(v);
      }
      return sanitizedObj;
    }

    return data;
  }

  private static sanitizeString(str: string): string {
    return str
      .replace(this.PRIVATE_KEY_REGEX, m => `${m.slice(0, 4)}...[REDACTED_PRIVATE_KEY]...${m.slice(-4)}`)
      .replace(this.SUI_KEY_REGEX, '[REDACTED_SUI_KEY]');
  }
}