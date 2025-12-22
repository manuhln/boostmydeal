import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Generate a key from environment variable or use a default for development
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Use the environment key and pad/truncate to required length
    const key = Buffer.from(envKey, 'hex');
    if (key.length === KEY_LENGTH) {
      return key;
    }
    // If key is wrong length, derive a proper key from it
    return crypto.scryptSync(envKey, 'salt', KEY_LENGTH);
  }
  
  // Development fallback - generate a consistent key
  return crypto.scryptSync('development-key-secret', 'salt', KEY_LENGTH);
};

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt sensitive data like API keys
 */
export const encryptData = (text: string): EncryptedData => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

/**
 * Decrypt sensitive data like API keys
 */
export const decryptData = (encryptedData: EncryptedData): string => {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');
  
  const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Client-side simple encoding (not real encryption, just obfuscation for network transport)
 * Real encryption happens on server-side
 */
export const encodeApiKey = (apiKey: string): string => {
  // Simple base64 encoding with a prefix to identify encoded keys
  return `encoded_${Buffer.from(apiKey).toString('base64')}`;
};

/**
 * Server-side decode of client-encoded API key
 */
export const decodeApiKey = (encodedKey: string): string => {
  if (encodedKey.startsWith('encoded_')) {
    return Buffer.from(encodedKey.substring(8), 'base64').toString('utf8');
  }
  return encodedKey; // Return as-is if not encoded
};