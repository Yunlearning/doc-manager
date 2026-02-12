-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "standard_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tiers" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "tier_level" SMALLINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_tiers_project_id_idx" ON "document_tiers"("project_id");

-- CreateIndex
CREATE INDEX "document_tiers_parent_id_idx" ON "document_tiers"("parent_id");

-- CreateIndex
CREATE INDEX "documents_tier_id_idx" ON "documents"("tier_id");

-- AddForeignKey
ALTER TABLE "document_tiers" ADD CONSTRAINT "document_tiers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tiers" ADD CONSTRAINT "document_tiers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "document_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "document_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
