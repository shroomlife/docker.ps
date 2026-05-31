/**
 * One-off, idempotent backfill: encrypt any DockerHost.authKey still stored as
 * legacy plaintext (AES-256-GCM at rest). Safe to re-run — rows that are already
 * encrypted (isEncryptedSecret) are skipped.
 *
 * Usage (name the target DB explicitly via DATABASE_URL):
 *   bun run scripts/backfill-authkeys.ts
 *
 * Requires NUXT_SECRET_KEY and DATABASE_URL in the environment (.env is loaded).
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../shared/prisma/client'
import { encryptSecret, isEncryptedSecret } from '../server/utils/crypto'

const BATCH_SIZE = 100

const main = async (): Promise<void> => {
  const masterKey = process.env.NUXT_SECRET_KEY ?? ''
  if (!masterKey) {
    throw new Error('NUXT_SECRET_KEY is required to encrypt authKeys — aborting.')
  }

  const connectionString = `${process.env.DATABASE_URL}`
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  let cursorId: number | undefined
  let scanned = 0
  let migrated = 0

  try {
    // Cursor-paginated scan so the backfill stays bounded regardless of row count.
    for (;;) {
      const hosts = await prisma.dockerHost.findMany({
        take: BATCH_SIZE,
        ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
        orderBy: { id: 'asc' },
        select: { id: true, authKey: true },
      })

      if (hosts.length === 0) {
        break
      }

      for (const host of hosts) {
        scanned += 1
        if (isEncryptedSecret(host.authKey)) {
          continue
        }

        await prisma.dockerHost.update({
          where: { id: host.id },
          data: { authKey: encryptSecret(host.authKey, masterKey) },
        })
        migrated += 1
      }

      const lastHost = hosts.at(-1)
      if (!lastHost || hosts.length < BATCH_SIZE) {
        break
      }
      cursorId = lastHost.id
    }

    console.info(`authKey backfill complete: ${migrated} encrypted, ${scanned - migrated} already encrypted (${scanned} scanned).`)
  }
  finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('authKey backfill failed:', error)
  process.exitCode = 1
})
