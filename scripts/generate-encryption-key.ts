import * as crypto from 'crypto';

function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

console.log('\n🔐 Generating new encryption key...\n');
const key = generateEncryptionKey();

console.log('✅ Generated Encryption Key:');
console.log('━'.repeat(70));
console.log(key);
console.log('━'.repeat(70));

console.log('\n📋 Add this to your .env file:');
console.log('━'.repeat(70));
console.log(`ENCRYPTION_KEY=${key}`);
console.log('━'.repeat(70));

console.log('\n⚠️  IMPORTANT:');
console.log('  1. Keep this key SECRET and SECURE');
console.log('  2. NEVER commit this key to version control');
console.log('  3. Use different keys for different environments');
console.log('  4. Store production keys in secure vault (AWS Secrets Manager, etc)');
console.log('  5. If you lose this key, you CANNOT decrypt existing credentials\n');
