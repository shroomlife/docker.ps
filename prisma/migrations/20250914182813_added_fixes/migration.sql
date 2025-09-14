/*
  Warnings:

  - A unique constraint covering the columns `[type,externalId]` on the table `UserIdentity` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,type]` on the table `UserIdentity` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."DockerHost" DROP CONSTRAINT "DockerHost_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserIdentity" DROP CONSTRAINT "UserIdentity_userId_fkey";

-- CreateIndex
CREATE INDEX "UserIdentity_userId_idx" ON "public"."UserIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_type_externalId_key" ON "public"."UserIdentity"("type", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_userId_type_key" ON "public"."UserIdentity"("userId", "type");

-- AddForeignKey
ALTER TABLE "public"."UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DockerHost" ADD CONSTRAINT "DockerHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
