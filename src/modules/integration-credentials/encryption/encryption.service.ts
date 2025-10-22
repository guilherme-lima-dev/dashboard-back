import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly authTagLength = 16;
    private readonly encoding: BufferEncoding = 'hex';

    constructor(private readonly configService: ConfigService) {}

    private getEncryptionKey(): Buffer {
        const key = this.configService.get<string>('ENCRYPTION_KEY');

        if (!key) {
            throw new Error('ENCRYPTION_KEY not found in environment variables');
        }

        if (key.length !== this.keyLength * 2) {
            throw new Error(`ENCRYPTION_KEY must be ${this.keyLength * 2} characters (${this.keyLength} bytes in hex)`);
        }

        return Buffer.from(key, 'hex');
    }

    encrypt(plaintext: string): string {
        try {
            const key = this.getEncryptionKey();
            const iv = crypto.randomBytes(this.ivLength);

            const cipher = crypto.createCipheriv(this.algorithm, key, iv);

            let encrypted = cipher.update(plaintext, 'utf8', this.encoding);
            encrypted += cipher.final(this.encoding);

            const authTag = cipher.getAuthTag();

            const result = {
                iv: iv.toString(this.encoding),
                encrypted: encrypted || '',
                authTag: authTag.toString(this.encoding),
            };

            return Buffer.from(JSON.stringify(result)).toString('base64');
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    decrypt(encryptedData: string): string {
        try {
            const key = this.getEncryptionKey();

            const parsed = JSON.parse(
                Buffer.from(encryptedData, 'base64').toString('utf8')
            );

            const { iv, encrypted, authTag } = parsed;

            if (!iv || authTag === undefined || encrypted === undefined) {
                throw new Error('Invalid encrypted data format');
            }

            const decipher = crypto.createDecipheriv(
                this.algorithm,
                key,
                Buffer.from(iv, this.encoding)
            );

            decipher.setAuthTag(Buffer.from(authTag, this.encoding));

            let decrypted = decipher.update(encrypted || '', this.encoding, 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    static generateEncryptionKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
