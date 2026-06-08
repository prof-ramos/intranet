'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { ZodType } from 'zod';
import { requireRole } from '@/lib/auth/authorization';
import { requireAuth } from '@/lib/auth/require-auth';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { parseFormAction, firstZodError, formDataToRecord } from './utils';

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

export function defineFormAction<TInput, TOutput = unknown>(options: {
  auth: readonly string[] | 'any';
  schema: ZodType<TInput>;
  preprocess?: (raw: Record<string, unknown>) => unknown;
  service: (input: TInput, user: UserContext) => Promise<TOutput>;
  revalidate?: RevalidateSpec;
  redirect?: string | ((output: TOutput) => string);
  rateLimit?: RateLimitConfig;
}): (formData: FormData) => Promise<TOutput> {
  return async (formData: FormData) => {
    if (options.rateLimit) await checkRateLimit(options.rateLimit);
    const user = await checkAuth(options.auth);
    const data = parseFormAction(formData, options.schema, options.preprocess);
    const output = await options.service(data, user);
    if (options.revalidate) applyRevalidate(options.revalidate);
    if (options.redirect) {
      const target = typeof options.redirect === 'string' ? options.redirect : options.redirect(output);
      redirect(target);
    }
    return output;
  };
}

export function defineFormStateAction<TInput, TReturn>(options: {
  auth: readonly string[] | 'any';
  schema?: ZodType<TInput>;
  preprocess?: (raw: Record<string, unknown>) => unknown;
  service: (input: TInput, user: UserContext) => Promise<TReturn>;
  revalidate?: RevalidateSpec;
  rateLimit?: RateLimitConfig;
  onError?: (error: unknown) => TReturn;
}): (_prevState: TReturn | null, formData: FormData) => Promise<TReturn> {
  return async (_prevState: TReturn | null, formData: FormData) => {
    try {
      if (options.rateLimit) await checkRateLimit(options.rateLimit);
      const user = await checkAuth(options.auth);
      let data: TInput;
      if (options.schema) {
        data = parseFormAction(formData, options.schema, options.preprocess);
      } else {
        data = formDataToRecord(formData) as TInput;
      }
      const output = await options.service(data, user);
      if (options.revalidate) applyRevalidate(options.revalidate);
      return output;
    } catch (error) {
      if (options.onError) return options.onError(error);
      throw error;
    }
  };
}

export function defineServerAction<TInput, TOutput = unknown>(options: {
  auth: readonly string[] | 'any';
  schema?: ZodType<TInput>;
  service: (input: TInput, user: UserContext) => Promise<TOutput>;
  revalidate?: RevalidateSpec;
  redirect?: string | ((output: TOutput) => string);
  rateLimit?: RateLimitConfig;
}): (input?: TInput) => Promise<TOutput> {
  return async (input?: TInput) => {
    if (options.rateLimit) await checkRateLimit(options.rateLimit);
    const user = await checkAuth(options.auth);
    let data: TInput | undefined = input;
    if (options.schema) {
      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        throw new Error(firstZodError(parsed.error.issues));
      }
      data = parsed.data;
    }
    const output = await options.service(data as TInput, user);
    if (options.revalidate) applyRevalidate(options.revalidate);
    if (options.redirect) {
      const target = typeof options.redirect === 'string' ? options.redirect : options.redirect(output);
      redirect(target);
    }
    return output;
  };
}
