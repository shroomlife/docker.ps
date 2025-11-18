import { Elysia } from "elysia";
import Dockerode, { Container, ContainerInfo, ContainerInspectInfo } from 'dockerode'
import { randomBytes, createHash } from 'crypto';
import { rmSync, watch } from "fs";
import { join } from "path";
import { mkdir } from "node:fs/promises";

const keyPrefix = 'docker_ps';

const keyStringLength = keyPrefix.length + 1 + 128;
const isProduction = process.env.NODE_ENV === 'production';
const authKeyFilePath = join(process.cwd(), 'data', '_auth.key');
const headerKeyName = 'x-auth-key';

const getDockerAPI = (): Dockerode => {
  console.info(`🔧 Initializing Dockerode in ${isProduction ? 'Production' : 'Development'} Mode`);
  if (isProduction) {
    return new Dockerode({ socketPath: '/var/run/docker.sock' });
  }
  return new Dockerode({ protocol: 'http', host: 'localhost', port: 2375, });
}

const removeAuthKeyFileAndSendError = (message: string): void => {
  console.error(message);
  rmSync(authKeyFilePath);
  console.error('The existing Auth Key file has been deleted. Please restart the application to generate a new one.');
  process.exit(1);
}

const getOrCreateAuthKey = async (): Promise<string> => {
  try {

    await mkdir(join(process.cwd(), 'data'), { recursive: true });

    const isKeyFileExisting = await Bun.file(authKeyFilePath).exists();
    if (isKeyFileExisting) {
      const existingKey = (await Bun.file(authKeyFilePath).text()).trim();
      console.log('✅ Found Auth Key File');

      if(existingKey.length !== keyStringLength) {
        removeAuthKeyFileAndSendError('❌ Auth Key has invalid length.');
      }

      if (!existingKey.startsWith(keyPrefix)) {
        removeAuthKeyFileAndSendError('❌ Auth Key is missing required prefix.');
      }
      return existingKey;
    }

    const randomPart = randomBytes(64).toString('hex');
    const newKey = [keyPrefix, randomPart].join('_');
    await Bun.write(authKeyFilePath, newKey);
    console.log('✅ Auth Key file created successfully');
    return newKey;

  } catch (error) {
    console.error('There was an error while creating or using the Auth Key');
    console.error('Detailed Error: ', error);
    process.exit(1);
  }
};

try {
  const DockerAPI = getDockerAPI();
  await DockerAPI.ping();
  console.log('✅ Successfully connected to Docker Daemon');

  const authKey = await getOrCreateAuthKey();
  console.info('🔑 Your Auth Key: \x1b[1m' + authKey + '\x1b[0m');

  watch(authKeyFilePath, async () => {
    console.warn('Auth Key file has been changed externally. Service will terminate for security reasons.');
    process.exit(1);
  });

  const app = new Elysia()
    .onRequest(async ({ request, status }) => {
      const providedKey = request.headers.get(headerKeyName);
      if (!providedKey) {
        return status(401);
      }
      const providedKeyHash = createHash('sha256').update(providedKey).digest('hex');
      const validKeyHash = createHash('sha256').update(authKey).digest('hex');
      if (providedKeyHash !== validKeyHash) {
        return status(401);
      }
    })

    // Route to Check if Server is Running
    .get('/', async ({ status }) => {
      return status(200);
    })

    // Route to List all Containers
    .get('/containers', async (): Promise<ContainerInfo[]> => {
      console.info('📦 Fetching List of Containers', new Date().toISOString());
      return await DockerAPI.listContainers({ all: true });
    })

    // Route to Get Details of a Specific Container
    .get('/containers/:id', async ({ params }): Promise<ContainerInspectInfo> => {
      console.info(`📦 Fetching Details of Container ${params.id}`, new Date().toISOString());
      const container: Container = DockerAPI.getContainer(params.id);
      return await container.inspect();
    })

    .get('/containers/:id/pause', async ({ params }) => {
        const container = DockerAPI.getContainer(params.id);
        await container.pause();
        return await container.inspect();
    })

    .get('/containers/:id/unpause', async ({ params }) => {
        const container = DockerAPI.getContainer(params.id);
        await container.unpause();
        return await container.inspect();
    })

    .get('/containers/:id/start', async ({ params }) => {
        const container = DockerAPI.getContainer(params.id);
        await container.start();
        return await container.inspect();
    })

    .get('/containers/:id/stop', async ({ params }) => {
        const container = DockerAPI.getContainer(params.id);
        await container.stop();
        return await container.inspect();
    })

    .get('/containers/:id/restart', async ({ params }) => {
        const container = DockerAPI.getContainer(params.id);
        await container.restart();
        return await container.inspect();
    })

    .get('/containers/:id/remove', async ({ params }) => {
        const container = DockerAPI.getContainer(params.id);
        await container.remove({ force: true });
        return { message: `Container ${params.id} has been removed.` };
    })

    .listen(3000);

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );

} catch (error) {
  console.error('There was an Error while connecting to Docker Daemon');
  console.error('Please make sure that the Docker Daemon is running and that the socket is mounted correctly.');
  console.error('Mount the socket with "-v /var/run/docker.sock:/var/run/docker.sock"');
  console.error('Detailed Error: ', error);
  process.exit(1);
}
