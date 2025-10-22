-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "platform_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_platform_id_status_received_at_idx" ON "webhook_events"("platform_id", "status", "received_at");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_platform_id_external_event_id_key" ON "webhook_events"("platform_id", "external_event_id");

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
