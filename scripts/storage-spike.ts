import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export type StorageProvider = 'r2' | 'garage';

export const SYNTHETIC_FIXTURE = Buffer.from('ASOF storage spike synthetic fixture v1\n', 'utf8');

type Environment = Record<string, string | undefined>;

export interface SpikeArgs {
  cleanup: boolean;
  provider: StorageProvider | 'both';
}

export interface ProviderConfig {
  bucket: string;
  endpoint: string;
  forcePathStyle: boolean;
  provider: StorageProvider;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ProviderSummary {
  provider: StorageProvider;
  bucket: string;
  checks: {
    contentTypeConstraint: 'rejected' | 'accepted';
    expiredUrl: 'rejected' | 'accepted';
    get: 'passed';
    head: 'passed';
    put: 'passed';
  };
  cleanup: 'completed' | 'not-requested';
}

function requiredEnvironment(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`Missing required POC environment variable: ${name}`);
  }
  return value;
}

export function assertPocNetworkEnabled(environment: Environment): void {
  if (environment.STORAGE_SPIKE_ALLOW_NETWORK !== 'true') {
    throw new Error(
      'Refusing network access. Set STORAGE_SPIKE_ALLOW_NETWORK=true for the isolated POC.',
    );
  }
}

export function validatePocBucket(bucket: string): void {
  if (!bucket || /(?:^|[-_])(prod|production|main)(?:$|[-_])/i.test(bucket)) {
    throw new Error(
      `Unsafe POC bucket name "${bucket || '<empty>'}". Use a dedicated non-production bucket.`,
    );
  }
}

export function createStorageKey(runId: string, suffix: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,63}$/.test(runId)) {
    throw new Error('Storage spike run ID must be an opaque alphanumeric token.');
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(suffix)) {
    throw new Error('Storage spike key suffix contains unsupported characters.');
  }
  return `storage-spike/${runId}/${suffix}`;
}

export function parseArgs(
  argv: readonly string[],
  environment: Environment = process.env,
): SpikeArgs {
  const providerArgument = argv
    .find((argument) => argument.startsWith('--provider='))
    ?.split('=', 2)[1];
  const provider = providerArgument ?? environment.STORAGE_SPIKE_PROVIDER ?? 'r2';
  if (provider !== 'r2' && provider !== 'garage' && provider !== 'both') {
    throw new Error('Provider must be r2, garage, or both.');
  }

  return {
    cleanup: argv.includes('--cleanup'),
    provider,
  };
}

export function resolveProviderConfig(
  provider: StorageProvider,
  environment: Environment = process.env,
): ProviderConfig {
  if (provider === 'r2') {
    const accountId = requiredEnvironment(environment, 'R2_POC_ACCOUNT_ID');
    const bucket = requiredEnvironment(environment, 'R2_POC_BUCKET');
    validatePocBucket(bucket);
    return {
      provider,
      bucket,
      endpoint:
        environment.R2_POC_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: false,
      region: environment.R2_POC_REGION?.trim() || 'auto',
      accessKeyId: requiredEnvironment(environment, 'R2_POC_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnvironment(environment, 'R2_POC_SECRET_ACCESS_KEY'),
    };
  }

  const bucket = requiredEnvironment(environment, 'GARAGE_POC_BUCKET');
  validatePocBucket(bucket);
  return {
    provider,
    bucket,
    endpoint: requiredEnvironment(environment, 'GARAGE_POC_ENDPOINT'),
    forcePathStyle: true,
    region: environment.GARAGE_POC_REGION?.trim() || 'garage',
    accessKeyId: requiredEnvironment(environment, 'GARAGE_POC_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnvironment(environment, 'GARAGE_POC_SECRET_ACCESS_KEY'),
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function expectSuccessful(response: Response, operation: string) {
  if (!response.ok) {
    throw new Error(`${operation} failed with HTTP ${response.status}.`);
  }
}

async function runProvider(
  provider: StorageProvider,
  args: SpikeArgs,
  environment: Environment,
): Promise<ProviderSummary> {
  const config = resolveProviderConfig(provider, environment);
  const client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  });
  const runId = randomUUID().replaceAll('-', '').slice(0, 16);
  const fixtureKey = createStorageKey(runId, 'fixture.txt');
  const contentTypeKey = createStorageKey(runId, 'content-type.txt');
  const expiryKey = createStorageKey(runId, 'expiry.txt');
  const keys = [fixtureKey, contentTypeKey, expiryKey];

  try {
    const putUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        ContentType: 'text/plain; charset=utf-8',
        Key: fixtureKey,
      }),
      { expiresIn: 300 },
    );
    await expectSuccessful(
      await fetch(putUrl, {
        body: SYNTHETIC_FIXTURE,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        method: 'PUT',
      }),
      'presigned PUT',
    );

    const head = await client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: fixtureKey }),
    );
    if (
      head.ContentLength !== SYNTHETIC_FIXTURE.byteLength ||
      !head.ContentType?.startsWith('text/plain')
    ) {
      throw new Error('HEAD metadata did not match the synthetic fixture.');
    }

    const getUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: fixtureKey }),
      { expiresIn: 300 },
    );
    const getResponse = await fetch(getUrl);
    await expectSuccessful(getResponse, 'presigned GET');
    const downloaded = Buffer.from(await getResponse.arrayBuffer());
    if (!downloaded.equals(SYNTHETIC_FIXTURE)) {
      throw new Error('Downloaded fixture differs from the uploaded bytes.');
    }

    const contentTypeUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        ContentType: 'text/plain; charset=utf-8',
        Key: contentTypeKey,
      }),
      { expiresIn: 300 },
    );
    const contentTypeResponse = await fetch(contentTypeUrl, {
      body: SYNTHETIC_FIXTURE,
      headers: { 'content-type': 'application/octet-stream' },
      method: 'PUT',
    });

    const expiryPutUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        ContentType: 'text/plain; charset=utf-8',
        Key: expiryKey,
      }),
      { expiresIn: 300 },
    );
    await expectSuccessful(
      await fetch(expiryPutUrl, {
        body: SYNTHETIC_FIXTURE,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        method: 'PUT',
      }),
      'presigned expiry fixture PUT',
    );

    const expiryUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: expiryKey }),
      { expiresIn: 1 },
    );
    await wait(1_500);
    const expiryResponse = await fetch(expiryUrl);

    return {
      provider,
      bucket: config.bucket,
      checks: {
        contentTypeConstraint: contentTypeResponse.ok ? 'accepted' : 'rejected',
        expiredUrl: expiryResponse.ok ? 'accepted' : 'rejected',
        get: 'passed',
        head: 'passed',
        put: 'passed',
      },
      cleanup: args.cleanup ? 'completed' : 'not-requested',
    };
  } finally {
    if (args.cleanup) {
      await Promise.all(
        keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key }))),
      );
    }
    client.destroy();
  }
}

export async function runStorageSpike(
  args: SpikeArgs,
  environment: Environment = process.env,
): Promise<ProviderSummary[]> {
  assertPocNetworkEnabled(environment);
  const providers: StorageProvider[] =
    args.provider === 'both' ? ['r2', 'garage'] : [args.provider];
  const summaries: ProviderSummary[] = [];
  for (const provider of providers) {
    summaries.push(await runProvider(provider, args, environment));
  }
  return summaries;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const summaries = await runStorageSpike(args);
  console.log(JSON.stringify({ summaries }, null, 2));
}

if (process.argv[1]?.endsWith('/storage-spike.ts')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown spike failure';
    console.error(`Storage spike failed: ${message}`);
    process.exitCode = 1;
  });
}
