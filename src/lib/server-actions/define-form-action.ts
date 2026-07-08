import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { headers } from 'next/headers';
import { type ZodType, z } from 'zod';
import { requireRole } from '@/lib/auth/authorization';
import { requireAuth } from '@/lib/auth/require-auth';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { parseFormAction, firstZodError } from './utils';

export type UserContext = Awaited<ReturnType<typeof requireAuth>>;

type RevalidateTagItem = string | { tag: string; opts?: string | Record<string, unknown> };
type RevalidateSpec =
  | string
  | string[]
  | { path?: string | string[]; tag?: RevalidateTagItem | RevalidateTagItem[] };

export interface RateLimitConfig {
  key: string;
  windowMs: number;
  maxRequests: number;
}

function normalizeRevalidate(spec: RevalidateSpec): { paths: string[]; tags: RevalidateTagItem[] } {
  const paths: string[] = [];
  const tags: RevalidateTagItem[] = [];
  if (typeof spec === 'string') {
    paths.push(spec);
  } else if (Array.isArray(spec)) {
    paths.push(...spec);
  } else {
    if (spec.path) {
      if (Array.isArray(spec.path)) paths.push(...spec.path);
      else paths.push(spec.path);
    }
    if (spec.tag) {
      if (Array.isArray(spec.tag)) tags.push(...spec.tag);
      else tags.push(spec.tag);
    }
  }
  return { paths, tags };
}

async function checkAuth(auth: readonly string[] | 'any'): Promise<UserContext> {
  if (auth === 'any') {
    return await requireAuth();
  }
  return await requireRole(auth as import('@/lib/auth/config').AuthRole[]);
}

async function checkRateLimit(config: RateLimitConfig) {
  const h = await headers();
  const ip = getTrustedClientIp(h);
  const result = await consumeIpRateLimit(ip, config.key, {
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
  });
  if (!result.allowed) {
    throw new Error('Muitas requisições. Aguarde um momento.');
  }
}

function applyRevalidate(spec: RevalidateSpec) {
  const { paths, tags } = normalizeRevalidate(spec);
  for (const p of paths) revalidatePath(p);
  for (const t of tags) {
    if (typeof t === 'string') {
      revalidateTag(t, 'max');
    } else {
      revalidateTag(t.tag, t.opts ?? 'max');
    }
  }
}

async function executeActionCore<TOutput>(
  options: {
    auth: readonly string[] | 'any';
    rateLimit?: RateLimitConfig;
    revalidate?: RevalidateSpec;
    redirect?: string | ((output: TOutput) => string);
  },
  serviceCall: (user: UserContext) => Promise<TOutput>,
): Promise<TOutput> {
  if (options.rateLimit) await checkRateLimit(options.rateLimit);
  const user = await checkAuth(options.auth);
  const output = await serviceCall(user);
  if (options.revalidate) applyRevalidate(options.revalidate);
  if (options.redirect) {
    const target = typeof options.redirect === 'string' ? options.redirect : options.redirect(output);
    redirect(target);
  }
  return output;
}

export function defineFormAction<TSchema extends ZodType, TOutput = unknown>(options: {
  auth: readonly string[] | 'any';
  schema: TSchema;
  preprocess?: (raw: Record<string, unknown>) => unknown;
  service: (input: z.output<TSchema>, user: UserContext) => Promise<TOutput>;
  revalidate?: RevalidateSpec;
  redirect?: string | ((output: TOutput) => string);
  rateLimit?: RateLimitConfig;
}): (formData: FormData) => Promise<TOutput> {
  return async (formData: FormData) => {
    return executeActionCore(options, async (user) => {
      const data = parseFormAction(formData, options.schema, options.preprocess);
      return options.service(data, user);
    });
  };
}

export function defineFormStateAction<TSchema extends ZodType, TReturn>(options: {
  auth: readonly string[] | 'any';
  schema: TSchema;
  preprocess?: (raw: Record<string, unknown>) => unknown;
  service: (input: z.output<TSchema>, user: UserContext) => Promise<TReturn>;
  revalidate?: RevalidateSpec;
  rateLimit?: RateLimitConfig;
  onError?: (error: unknown) => TReturn;
}): (_prevState: TReturn | null, formData: FormData) => Promise<TReturn> {
  return async (_prevState: TReturn | null, formData: FormData) => {
    try {
      return await executeActionCore(options, async (user) => {
        const data = parseFormAction(formData, options.schema, options.preprocess);
        return options.service(data, user);
      });
    } catch (error) {
      if (isRedirectError(error)) throw error;
      if (options.onError) return options.onError(error);
      throw error;
    }
  };
}

export function defineServerAction<TSchema extends ZodType, TOutput = unknown>(options: {
  auth: readonly string[] | 'any';
  schema: TSchema;
  service: (input: z.output<TSchema>, user: UserContext) => Promise<TOutput>;
  revalidate?: RevalidateSpec;
  redirect?: string | ((output: TOutput) => string);
  rateLimit?: RateLimitConfig;
}): (input: z.input<TSchema>) => Promise<TOutput> {
  return async (input: z.input<TSchema>) => {
    return executeActionCore(options, async (user) => {
      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        throw new Error(firstZodError(parsed.error.issues));
      }
      return options.service(parsed.data, user);
    });
  };
}

export function defineNoInputServerAction<TOutput = unknown>(options: {
  auth: readonly string[] | 'any';
  service: (user: UserContext) => Promise<TOutput>;
  revalidate?: RevalidateSpec;
  redirect?: string | ((output: TOutput) => string);
  rateLimit?: RateLimitConfig;
}): () => Promise<TOutput> {
  return async () => {
    return executeActionCore(options, async (user) => options.service(user));
  };
}
