import CryptoJS from 'crypto-js';
import Conf from 'conf';

const config = new Conf({ projectName: 'aura-os' });

export class Vault {
  // Save Encrypted Keys
  static saveKey(privateKey: string, masterPassword: string): void {
    const encrypted = CryptoJS.AES.encrypt(privateKey, masterPassword).toString();
    config.set('encrypted_key', encrypted);
  }

  // Get Decrypted Key
  static getKey(masterPassword: string): string | null {
    const encrypted = config.get('encrypted_key') as string;
    if (!encrypted) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, masterPassword);
      const originalKey = bytes.toString(CryptoJS.enc.Utf8);
      if (!originalKey) return null;
      return originalKey;
    } catch (e) {
      return null;
    }
  }

  static isSetup(): boolean {
    return !!config.get('encrypted_key');
  }
}