export class Sanitizer {
  private static readonly PRIVATE_KEY_REGEX = /\b(0x)?[a-fA-F0-9]{64}\b/g;
  private static readonly SUI_KEY_REGEX = /suiprivkey[a-zA-Z0-9]+/g;

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
        const sensitiveKeys = ['password', 'privatekey', 'secret', 'key', 'seed', 'mnemonic'];
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = this.sanitize(value);
        }
      }
      return sanitizedObj;
    }

    return data;
  }

  private static sanitizeString(str: any): string {
    if (typeof str !== 'string') return String(str);
    let sanitized = str;
    sanitized = sanitized.replace(this.PRIVATE_KEY_REGEX, (match) => {
      return `${match.slice(0, 4)}...[REDACTED]...${match.slice(-4)}`;
    });
    sanitized = sanitized.replace(this.SUI_KEY_REGEX, '[REDACTED]');
    return sanitized;
  }
}
