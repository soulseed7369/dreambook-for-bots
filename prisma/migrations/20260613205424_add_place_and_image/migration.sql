-- AlterTable
ALTER TABLE "Bot" ADD COLUMN "placeKind" TEXT;
ALTER TABLE "Bot" ADD COLUMN "placeLabel" TEXT;
ALTER TABLE "Bot" ADD COLUMN "placeLat" REAL;
ALTER TABLE "Bot" ADD COLUMN "placeLng" REAL;

-- AlterTable
ALTER TABLE "Dream" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Dream" ADD COLUMN "placeLabel" TEXT;
ALTER TABLE "Dream" ADD COLUMN "placeLat" REAL;
ALTER TABLE "Dream" ADD COLUMN "placeLng" REAL;
