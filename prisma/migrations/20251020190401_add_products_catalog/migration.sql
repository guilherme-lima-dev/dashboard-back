-- CreateTable
CREATE TABLE "platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "product_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "billing_type" TEXT NOT NULL,
    "billing_period" TEXT,
    "billing_interval" INTEGER NOT NULL DEFAULT 1,
    "has_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_period_days" INTEGER,
    "trial_amount" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_platform_mappings" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "platform_id" TEXT NOT NULL,
    "external_product_id" TEXT NOT NULL,
    "external_price_id" TEXT,
    "price_amount" DECIMAL(10,2) NOT NULL,
    "price_currency" TEXT NOT NULL,
    "price_amount_brl" DECIMAL(10,2),
    "price_amount_usd" DECIMAL(10,2),
    "trial_amount" DECIMAL(10,2),
    "trial_currency" TEXT,
    "trial_amount_brl" DECIMAL(10,2),
    "trial_amount_usd" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_platform_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platforms_slug_key" ON "platforms"("slug");

-- CreateIndex
CREATE INDEX "platforms_slug_idx" ON "platforms"("slug");

-- CreateIndex
CREATE INDEX "platforms_is_enabled_idx" ON "platforms"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_product_type_idx" ON "products"("product_type");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "offers_product_id_idx" ON "offers"("product_id");

-- CreateIndex
CREATE INDEX "offers_is_active_idx" ON "offers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "offers_product_id_slug_key" ON "offers"("product_id", "slug");

-- CreateIndex
CREATE INDEX "offer_platform_mappings_offer_id_idx" ON "offer_platform_mappings"("offer_id");

-- CreateIndex
CREATE INDEX "offer_platform_mappings_platform_id_idx" ON "offer_platform_mappings"("platform_id");

-- CreateIndex
CREATE INDEX "offer_platform_mappings_platform_id_external_product_id_idx" ON "offer_platform_mappings"("platform_id", "external_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_platform_mappings_platform_id_external_product_id_key" ON "offer_platform_mappings"("platform_id", "external_product_id");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_platform_mappings" ADD CONSTRAINT "offer_platform_mappings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_platform_mappings" ADD CONSTRAINT "offer_platform_mappings_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
