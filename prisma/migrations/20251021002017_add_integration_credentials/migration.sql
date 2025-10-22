-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "platform_id" TEXT NOT NULL,
    "credential_type" TEXT NOT NULL,
    "credential_value" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_credentials_platform_id_is_active_idx" ON "integration_credentials"("platform_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_platform_id_credential_type_environ_key" ON "integration_credentials"("platform_id", "credential_type", "environment");

-- AddForeignKey
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
