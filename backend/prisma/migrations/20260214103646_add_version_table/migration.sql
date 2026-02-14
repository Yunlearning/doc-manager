/*
  Warnings:

  - You are about to drop the column `file_name` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `file_path` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `file_size` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `mime_type` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `uploaded_at` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `documents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "documents" DROP COLUMN "file_name",
DROP COLUMN "file_path",
DROP COLUMN "file_size",
DROP COLUMN "mime_type",
DROP COLUMN "uploaded_at",
DROP COLUMN "version",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "uploaded_by_id" UUID;

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "changelog" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
