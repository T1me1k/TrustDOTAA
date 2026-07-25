export type Localized = {
  nameEn?: string;
  nameRu?: string;
  titleEn?: string;
  titleRu?: string;
  descriptionEn?: string;
  descriptionRu?: string;
};

export type RowVersioned = { id: string; rowVersion: number };
export type HeroStatus = 'active' | 'disabled' | 'hidden' | 'archived';

export type Hero = RowVersioned & Localized & {
  slug: string;
  externalId?: string;
  shortName?: string;
  primaryAttribute: 'strength' | 'agility' | 'intelligence' | 'universal';
  attackType: 'melee' | 'ranged';
  roles: string[];
  tags: string[];
  portraitUrl?: string;
  iconUrl?: string;
  status: HeroStatus;
  sortOrder: number;
  updatedAt?: string;
  currentData?: Record<string, number | Record<string, unknown>>;
  baseStats: Record<string, number | Record<string, unknown>>;
  abilities?: Ability[];
};

export type AbilityValue = number | number[];
export type Ability = RowVersioned & Localized & {
  slug: string;
  slot: 'Q' | 'W' | 'E' | 'R' | 'Innate';
  type: 'basic' | 'ultimate' | 'innate';
  maxLevel: number;
  status: HeroStatus;
  abilityData: Record<string, AbilityValue | unknown>;
};

export type PatchStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'superseded' | 'archived';
export type BalancePatch = RowVersioned & Localized & {
  slug: string;
  version: string;
  summaryEn?: string;
  summaryRu?: string;
  releaseChannel: 'test' | 'production';
  status: PatchStatus;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledAt?: string;
  publishedAt?: string;
  entries?: PatchEntry[];
  validation?: ValidationResult;
};

export type PatchEntry = {
  id: string;
  entityType: 'hero' | 'ability' | 'facet' | 'talent' | 'upgrade' | 'system';
  entityId?: string;
  operation: 'create' | 'update' | 'archive' | 'restore';
  category: 'Buff' | 'Nerf' | 'Rework' | 'Fix' | 'System';
  titleEn: string;
  titleRu: string;
  descriptionEn: string;
  descriptionRu: string;
  beforeData: unknown;
  afterData: unknown;
  sortOrder: number;
};

export type ValidationIssue = {
  path?: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning';
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  dryRunJobId?: string;
  validCount?: number;
  invalidCount?: number;
};

export type AuditEvent = {
  id: string;
  createdAt: string;
  actorType?: string;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  requestId?: string;
};

export type DashboardData = {
  heroCount: number;
  abilityCount: number;
  draftPatchCount: number;
  reviewPatchCount: number;
  currentProductionVersion?: string;
  scheduledPatch?: BalancePatch;
  recentHeroes?: Hero[];
  recentPatches?: BalancePatch[];
  recentAudit?: AuditEvent[];
  validationWarnings?: ValidationIssue[];
};
