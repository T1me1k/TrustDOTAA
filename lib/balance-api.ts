'use client';

import type {
  AuditEvent,
  BalancePatch,
  DashboardData,
  Hero,
  PatchEntry,
  ValidationIssue,
  ValidationResult,
} from './balance-types';

type JsonRecord = Record<string, unknown>;

export class BalanceApiError extends Error {
  constructor(message: string, public status: number, public payload: unknown) {
    super(message);
  }
}

let heroCache: Hero[] | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) return value;
  const nested = asRecord(value)[key];
  return Array.isArray(nested) ? nested : [];
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function errorMessage(payload: unknown, status: number): string {
  const body = asRecord(payload);
  const nested = asRecord(body.error);
  if (typeof nested.message === 'string') return nested.message;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;
  return `Request failed (${status})`;
}

function normalizeHero(value: unknown): Hero {
  const source = asRecord(value);
  const stats = isRecord(source.currentData)
    ? source.currentData
    : isRecord(source.baseStats)
      ? source.baseStats
      : {};

  return {
    ...(source as unknown as Hero),
    id: String(source.id ?? ''),
    slug: String(source.slug ?? ''),
    rowVersion: asNumber(source.rowVersion),
    sortOrder: asNumber(source.sortOrder),
    primaryAttribute: String(source.primaryAttribute ?? 'strength') as Hero['primaryAttribute'],
    attackType: String(source.attackType ?? 'melee') as Hero['attackType'],
    status: String(source.status ?? 'hidden') as Hero['status'],
    roles: Array.isArray(source.roles) ? source.roles.map(String) : [],
    tags: Array.isArray(source.tags) ? source.tags.map(String) : [],
    currentData: stats as Hero['currentData'],
    baseStats: stats as Hero['baseStats'],
  };
}

function normalizeHeroResponse(payload: unknown): Hero {
  const body = asRecord(payload);
  const hero = normalizeHero(isRecord(body.hero) ? body.hero : payload);
  const abilities = asArray(payload, 'abilities');
  return abilities.length ? { ...hero, abilities: abilities as Hero['abilities'] } : hero;
}

function normalizePatch(value: unknown, entries?: unknown[]): BalancePatch {
  const source = asRecord(value);
  return {
    ...(source as unknown as BalancePatch),
    id: String(source.id ?? ''),
    slug: String(source.slug ?? ''),
    version: String(source.version ?? ''),
    rowVersion: asNumber(source.rowVersion),
    releaseChannel: String(source.releaseChannel ?? 'test') as BalancePatch['releaseChannel'],
    status: String(source.status ?? 'draft') as BalancePatch['status'],
    entries: (entries ?? (Array.isArray(source.entries) ? source.entries : [])) as PatchEntry[],
  };
}

function normalizePatchResponse(payload: unknown): BalancePatch {
  const body = asRecord(payload);
  return normalizePatch(isRecord(body.patch) ? body.patch : payload, asArray(payload, 'entries'));
}

function normalizeIssue(value: unknown): ValidationIssue {
  const source = asRecord(value);
  return {
    path: typeof source.path === 'string' ? source.path : undefined,
    message: String(source.message ?? source.error ?? 'Validation issue'),
    code: typeof source.code === 'string' ? source.code : undefined,
    severity: source.severity === 'warning' ? 'warning' : 'error',
  };
}

function normalizeValidation(payload: unknown): ValidationResult {
  const body = asRecord(payload);
  const issues = asArray(payload, 'issues').map(normalizeIssue);
  const directErrors = asArray(payload, 'errors').map(normalizeIssue);
  const directWarnings = asArray(payload, 'warnings').map(item => ({ ...normalizeIssue(item), severity: 'warning' as const }));
  const job = asRecord(body.job);
  const errors = [...issues.filter(issue => issue.severity !== 'warning'), ...directErrors];
  const warnings = [...issues.filter(issue => issue.severity === 'warning'), ...directWarnings];

  return {
    valid: body.valid === true,
    errors,
    warnings,
    dryRunJobId: job.id == null && body.dryRunJobId == null ? undefined : String(job.id ?? body.dryRunJobId),
    validCount: asNumber(job.validRows ?? body.validCount),
    invalidCount: asNumber(job.invalidRows ?? body.invalidCount ?? errors.length),
  };
}

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/admin/balance/${path}`, {
    ...init,
    signal,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (response.status === 401) {
    location.assign('/ops/login');
    throw new BalanceApiError('Session expired', 401, payload);
  }
  if (!response.ok) throw new BalanceApiError(errorMessage(payload, response.status), response.status, payload);
  return payload as T;
}

function heroPayload(hero: Partial<Hero>): JsonRecord {
  const { baseStats, currentData, abilities: _abilities, ...rest } = hero;
  return { ...rest, currentData: baseStats ?? currentData ?? {} };
}

function patchPayload(patch: Partial<BalancePatch>): JsonRecord {
  const { entries: _entries, validation: _validation, ...rest } = patch;
  return rest;
}

export const balanceApi = {
  request,
  dashboard: async (): Promise<DashboardData> => {
    const source = asRecord(await request<unknown>('dashboard'));
    const scheduled = isRecord(source.scheduledPatch) ? normalizePatch(source.scheduledPatch) : undefined;
    return {
      heroCount: asNumber(source.heroCount ?? source.heroes),
      abilityCount: asNumber(source.abilityCount ?? source.abilities),
      draftPatchCount: asNumber(source.draftPatchCount ?? source.drafts),
      reviewPatchCount: asNumber(source.reviewPatchCount ?? source.inReview),
      currentProductionVersion: source.currentProductionVersion == null && source.currentVersion == null
        ? undefined
        : String(source.currentProductionVersion ?? source.currentVersion),
      scheduledPatch: scheduled,
      recentHeroes: asArray(source, 'recentHeroes').map(normalizeHero),
      recentPatches: asArray(source, 'recentPatches').map(item => normalizePatch(item)),
      recentAudit: asArray(source, 'recentAudit') as AuditEvent[],
      validationWarnings: asArray(source, 'validationWarnings').map(normalizeIssue),
    };
  },
  heroes: async (force = false): Promise<Hero[]> => {
    if (heroCache && !force) return heroCache;
    heroCache = asArray(await request<unknown>('heroes'), 'heroes').map(normalizeHero);
    return heroCache;
  },
  hero: async (id: string): Promise<Hero> => normalizeHeroResponse(
    await request<unknown>(`heroes/${encodeURIComponent(id)}`),
  ),
  saveHero: async (hero: Partial<Hero>, id?: string): Promise<Hero> => {
    const saved = normalizeHeroResponse(await request<unknown>(id ? `heroes/${encodeURIComponent(id)}` : 'heroes', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(heroPayload(hero)),
    }));
    heroCache = null;
    return saved;
  },
  patches: async (): Promise<BalancePatch[]> => asArray(
    await request<unknown>('patches'),
    'patches',
  ).map(item => normalizePatch(item)),
  patch: async (id: string): Promise<BalancePatch> => normalizePatchResponse(
    await request<unknown>(`patches/${encodeURIComponent(id)}`),
  ),
  savePatch: async (patch: Partial<BalancePatch>, id?: string): Promise<BalancePatch> => normalizePatchResponse(
    await request<unknown>(id ? `patches/${encodeURIComponent(id)}` : 'patches', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(patchPayload(patch)),
    }),
  ),
  patchAction: async (id: string, action: string, body: JsonRecord): Promise<BalancePatch> => normalizePatchResponse(
    await request<unknown>(`patches/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  ),
  validatePatch: async (id: string, rowVersion: number): Promise<ValidationResult> => normalizeValidation(
    await request<unknown>(`patches/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      body: JSON.stringify({ rowVersion }),
    }),
  ),
  audit: async (): Promise<AuditEvent[]> => asArray(await request<unknown>('audit'), 'audit') as AuditEvent[],
  validateImport: async (body: unknown): Promise<ValidationResult> => normalizeValidation(
    await request<unknown>('import/validate', { method: 'POST', body: JSON.stringify(body) }),
  ),
  applyImport: async (body: unknown, dryRunJobId: string): Promise<unknown> => request<unknown>('import/apply', {
    method: 'POST',
    body: JSON.stringify(isRecord(body) ? { ...body, dryRunJobId } : { payload: body, dryRunJobId }),
  }),
  clearHeroCache: () => {
    heroCache = null;
  },
};
