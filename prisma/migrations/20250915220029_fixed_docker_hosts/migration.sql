/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `DockerHost` table. All the data in the column will be lost.
  - You are about to drop the column `port` on the `DockerHost` table. All the data in the column will be lost.
  - Added the required column `url` to the `DockerHost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."DockerHost" DROP COLUMN "ipAddress",
DROP COLUMN "port",
ADD COLUMN     "url" TEXT NOT NULL;
