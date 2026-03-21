/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `word_progress` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `word_progress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "word_progress" DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted";
