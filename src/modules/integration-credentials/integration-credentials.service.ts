import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './encryption/encryption.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { CredentialDto } from './dto/credential.dto';

@Injectable()
export class IntegrationCredentialsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly encryptionService: EncryptionService,
    ) {}

    async create(createDto: CreateCredentialDto): Promise<CredentialDto> {
        const platform = await this.prisma.platform.findUnique({
            where: { id: createDto.platformId },
        });

        if (!platform) {
            throw new NotFoundException('Plataforma não encontrada');
        }

        const existingCredential = await this.prisma.integrationCredential.findUnique({
            where: {
                unique_platform_credential: {
                    platformId: createDto.platformId,
                    credentialType: createDto.credentialType,
                    environment: createDto.environment || 'production',
                },
            },
        });

        if (existingCredential) {
            throw new ConflictException(
                'Credencial já existe para esta plataforma, tipo e ambiente',
            );
        }

        const encryptedValue = this.encryptionService.encrypt(createDto.credentialValue);

        const credential = await this.prisma.integrationCredential.create({
            data: {
                platformId: createDto.platformId,
                credentialType: createDto.credentialType,
                credentialValue: encryptedValue,
                environment: createDto.environment || 'production',
                isActive: createDto.isActive ?? true,
                expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
            },
        });

        return this.toDto(credential, false);
    }

    async findAll(includeDecrypted = false): Promise<CredentialDto[]> {
        const credentials = await this.prisma.integrationCredential.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return credentials.map(credential => this.toDto(credential, includeDecrypted));
    }

    async findByPlatform(platformId: string, includeDecrypted = false): Promise<CredentialDto[]> {
        const platform = await this.prisma.platform.findUnique({
            where: { id: platformId },
        });

        if (!platform) {
            throw new NotFoundException('Plataforma não encontrada');
        }

        const credentials = await this.prisma.integrationCredential.findMany({
            where: { platformId },
            orderBy: { createdAt: 'desc' },
        });

        return credentials.map(credential => this.toDto(credential, includeDecrypted));
    }

    async findOne(id: string, includeDecrypted = false): Promise<CredentialDto> {
        const credential = await this.prisma.integrationCredential.findUnique({
            where: { id },
        });

        if (!credential) {
            throw new NotFoundException('Credencial não encontrada');
        }

        return this.toDto(credential, includeDecrypted);
    }

    async findByType(
        platformId: string,
        credentialType: string,
        environment: string,
        includeDecrypted = false,
    ): Promise<CredentialDto> {
        const credential = await this.prisma.integrationCredential.findUnique({
            where: {
                unique_platform_credential: {
                    platformId,
                    credentialType,
                    environment,
                },
            },
        });

        if (!credential) {
            throw new NotFoundException('Credencial não encontrada');
        }

        return this.toDto(credential, includeDecrypted);
    }

    async update(id: string, updateDto: UpdateCredentialDto): Promise<CredentialDto> {
        const existingCredential = await this.prisma.integrationCredential.findUnique({
            where: { id },
        });

        if (!existingCredential) {
            throw new NotFoundException('Credencial não encontrada');
        }

        const updateData: any = {};

        if (updateDto.credentialValue !== undefined) {
            updateData.credentialValue = this.encryptionService.encrypt(updateDto.credentialValue);
        }

        if (updateDto.isActive !== undefined) {
            updateData.isActive = updateDto.isActive;
        }

        if (updateDto.expiresAt !== undefined) {
            updateData.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : null;
        }

        const credential = await this.prisma.integrationCredential.update({
            where: { id },
            data: updateData,
        });

        return this.toDto(credential, false);
    }

    async remove(id: string): Promise<void> {
        const credential = await this.prisma.integrationCredential.findUnique({
            where: { id },
        });

        if (!credential) {
            throw new NotFoundException('Credencial não encontrada');
        }

        await this.prisma.integrationCredential.delete({
            where: { id },
        });
    }

    async testConnection(id: string): Promise<{ success: boolean; message: string }> {
        const credential = await this.findOne(id, true);

        if (!credential.isActive) {
            throw new BadRequestException('Credencial está inativa');
        }

        if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
            throw new BadRequestException('Credencial expirou');
        }

        return {
            success: true,
            message: 'Credencial válida e ativa',
        };
    }

    private toDto(credential: any, includeDecrypted: boolean): CredentialDto {
        const dto: CredentialDto = {
            id: credential.id,
            platformId: credential.platformId,
            credentialType: credential.credentialType,
            environment: credential.environment,
            isActive: credential.isActive,
            expiresAt: credential.expiresAt,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt,
        };

        if (includeDecrypted) {
            try {
                dto.decryptedValue = this.encryptionService.decrypt(credential.credentialValue);
            } catch (error) {
                dto.decryptedValue = '[ERRO AO DESCRIPTOGRAFAR]';
            }
        }

        return dto;
    }
}
