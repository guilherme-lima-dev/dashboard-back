import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationCredentialsService } from './integration-credentials.service';
import { IntegrationCredentialsController } from './integration-credentials.controller';
import { EncryptionService } from './encryption/encryption.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [IntegrationCredentialsController],
    providers: [IntegrationCredentialsService, EncryptionService],
    exports: [IntegrationCredentialsService, EncryptionService],
})
export class IntegrationCredentialsModule {}
