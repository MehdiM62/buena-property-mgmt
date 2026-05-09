-- CreateEnum
CREATE TYPE "ManagementType" AS ENUM ('WEG', 'MV');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('draft', 'active');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('apartment', 'office', 'garden', 'parking');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('pending', 'done', 'failed');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "object_number" TEXT NOT NULL,
    "management_type" "ManagementType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'draft',
    "property_manager_name" TEXT,
    "property_manager_company" TEXT,
    "accountant_name" TEXT,
    "accountant_company" TEXT,
    "document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "house_number" TEXT NOT NULL,
    "additional_info" TEXT,
    "construction_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "unit_number" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "floor" TEXT,
    "entrance" TEXT,
    "size_sqm" DECIMAL(10,2) NOT NULL,
    "co_ownership_share" TEXT NOT NULL,
    "construction_year" INTEGER,
    "rooms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extraction" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'pending',
    "raw_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Extraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_object_number_key" ON "Property"("object_number");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extraction" ADD CONSTRAINT "Extraction_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
