import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
    let service: EncryptionService;
    let configService: ConfigService;

    const mockEncryptionKey = EncryptionService.generateEncryptionKey();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'ENCRYPTION_KEY') {
                                return mockEncryptionKey;
                            }
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('encrypt', () => {
        it('should encrypt a string successfully', () => {
            const plaintext = 'sk_test_1234567890abcdef';
            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
            expect(encrypted).not.toBe(plaintext);
            expect(encrypted.length).toBeGreaterThan(0);
        });

        it('should produce different ciphertexts for the same plaintext (different IVs)', () => {
            const plaintext = 'sk_test_1234567890abcdef';
            const encrypted1 = service.encrypt(plaintext);
            const encrypted2 = service.encrypt(plaintext);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should throw error when ENCRYPTION_KEY is missing', () => {
            jest.spyOn(configService, 'get').mockReturnValue(null);

            expect(() => service.encrypt('test')).toThrow('ENCRYPTION_KEY not found');
        });

        it('should encrypt empty string', () => {
            const encrypted = service.encrypt('');
            expect(encrypted).toBeDefined();
        });

        it('should encrypt special characters', () => {
            const plaintext = 'P@ssw0rd!#$%^&*()_+{}[]|\\:;"<>?,./~`';
            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
        });

        it('should encrypt unicode characters', () => {
            const plaintext = 'Olá Mundo! 你好世界 🔐🚀';
            const encrypted = service.encrypt(plaintext);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
        });
    });

    describe('decrypt', () => {
        it('should decrypt encrypted string correctly', () => {
            const plaintext = 'sk_test_1234567890abcdef';
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt empty string', () => {
            const plaintext = '';
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt special characters correctly', () => {
            const plaintext = 'P@ssw0rd!#$%^&*()_+{}[]|\\:;"<>?,./~`';
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should decrypt unicode characters correctly', () => {
            const plaintext = 'Olá Mundo! 你好世界 🔐🚀';
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should throw error for invalid encrypted data format', () => {
            const invalidData = Buffer.from('invalid data').toString('base64');

            expect(() => service.decrypt(invalidData)).toThrow('Decryption failed');
        });

        it('should throw error for corrupted encrypted data', () => {
            const plaintext = 'sk_test_1234567890abcdef';
            const encrypted = service.encrypt(plaintext);
            const corrupted = encrypted.slice(0, -5) + 'XXXXX';

            expect(() => service.decrypt(corrupted)).toThrow('Decryption failed');
        });

        it('should throw error when using wrong encryption key', () => {
            const plaintext = 'sk_test_1234567890abcdef';
            const encrypted = service.encrypt(plaintext);

            const wrongKey = EncryptionService.generateEncryptionKey();
            jest.spyOn(configService, 'get').mockReturnValue(wrongKey);

            expect(() => service.decrypt(encrypted)).toThrow('Decryption failed');
        });
    });

    describe('generateEncryptionKey', () => {
        it('should generate a valid encryption key', () => {
            const key = EncryptionService.generateEncryptionKey();

            expect(key).toBeDefined();
            expect(typeof key).toBe('string');
            expect(key.length).toBe(64); // 32 bytes in hex = 64 characters
        });

        it('should generate different keys each time', () => {
            const key1 = EncryptionService.generateEncryptionKey();
            const key2 = EncryptionService.generateEncryptionKey();

            expect(key1).not.toBe(key2);
        });
    });

    describe('end-to-end encryption/decryption', () => {
        const testCases = [
            { name: 'Stripe API Key', value: 'sk_test_51Hxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { name: 'Hotmart Client Secret', value: 'hs_secret_XXXXXXXXXXXXXXXXXXXXXXXX' },
            { name: 'Cartpanda API Key', value: 'cp_api_XXXXXXXXXXXXXXXXXXXXXXXX' },
            { name: 'Long text', value: 'a'.repeat(1000) },
            { name: 'JSON string', value: JSON.stringify({ key: 'value', nested: { data: 123 } }) },
        ];

        testCases.forEach(({ name, value }) => {
            it(`should correctly encrypt and decrypt: ${name}`, () => {
                const encrypted = service.encrypt(value);
                const decrypted = service.decrypt(encrypted);

                expect(decrypted).toBe(value);
                expect(encrypted).not.toBe(value);
            });
        });
    });
});
