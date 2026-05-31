import type { DockerHost } from '~~/shared/prisma/client'

import { decryptSecret, encryptSecret, isEncryptedSecret } from './crypto'

/**
 * Tolerant read of a stored authKey: decrypts AES-256-GCM blobs and lets legacy
 * plaintext keys pass through unchanged. Pure (master key injected) so it stays
 * unit-testable without a Nitro runtime context.
 */
export const resolveStoredAuthKey = (stored: string, masterKey: string): string =>
  isEncryptedSecret(stored) ? decryptSecret(stored, masterKey) : stored

/**
 * Central seam for loading a user's Docker host and handling its secret at rest.
 * All agent-calling endpoints go through here so authz, decryption and encryption
 * live in one place (precursor to the AgentBus consolidation).
 */
export const DockerHostService = {
  /**
   * Load a host scoped to its owner. `uuid` is the unique selector, `userId`
   * an additional authz filter — throws (P2025) if no matching row exists.
   */
  async getForUserOrFail(uuid: string, userId: number): Promise<DockerHost> {
    return await prismaClient.dockerHost.findUniqueOrThrow({
      where: {
        uuid,
        userId,
      },
    })
  },

  /** Decrypt a host's stored authKey for use as the agent `x-auth-key` header. */
  resolveAuthKey(host: Pick<DockerHost, 'authKey'>): string {
    const { secretKey } = useRuntimeConfig()
    return resolveStoredAuthKey(host.authKey, secretKey)
  },

  /** Encrypt a plaintext authKey for storage at rest. */
  encryptAuthKey(plaintext: string): string {
    const { secretKey } = useRuntimeConfig()
    return encryptSecret(plaintext, secretKey)
  },
}
