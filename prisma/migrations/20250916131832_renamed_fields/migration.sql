/*
  Warnings:

  - You are about to drop the column `username` on the `UserIdentity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserIdentity" DROP COLUMN "username",
ADD COLUMN     "email" VARCHAR(255);
