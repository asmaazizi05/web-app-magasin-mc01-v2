import type {
  Article,
  ArticleOrigin,
  Audit,
  CreateArticleInput,
  CreateExpeditionInput,
  CreateReceptionInput,
  CurrentAssignment,
  DashboardKpis,
  Expedition,
  ExpeditionStatus,
  InventoryKpis,
  Movement,
  MovementSummary,
  MovementType,
  Rack,
  Reception,
  Settings,
  SheetOptions,
  StockSheet,
  CreateStockSheetInput,
  Storekeeper,
  UpdateSettingsInput,
  Zone,
  ZoneDetail,
  PlanningView,
  ShiftType,
  StorekeeperSummary,
  StorekeeperProfile,
  StorekeeperInput,
  HabilitationView,
  HabilitationAlert,
  HabilitationTypeView,
  TrainingView,
  Engin,
  EnginAlert,
  EnginDetail,
  EnginInput,
  EnginOptions,
  EnginStatus,
  MaintenanceType,
  InterventionSummary,
  InterventionDetail,
  InterventionInput,
  InterventionStatus,
  TaskInput,
  TaskStatus,
  ReferentialItem,
  InventoryCount,
  DesignationRequest,
  PendingValidation,
  InventoryOptions,
  CountLineInput,
  ArticleCategory,
  AbcClass,
  ProfileInput,
  ProfileView,
} from './types';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Côté serveur on peut cibler une URL interne (API_URL) ; côté navigateur l'URL publique. */
function baseUrl(): string {
  if (typeof window === 'undefined') return process.env.API_URL ?? PUBLIC_API_URL;
  return PUBLIC_API_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path, baseUrl());
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** Message de refus quand la rubrique affichée est en consultation seule pour le profil actif (posé par ProfileProvider) */
let readOnlyMessage: string | null = null;
export const setApiReadOnly = (message: string | null): void => {
  readOnlyMessage = message;
};

async function request<T>(
  method: string,
  path: string,
  options: { query?: Query; body?: unknown; form?: FormData } = {},
): Promise<T> {
  if (method !== 'GET' && readOnlyMessage && typeof window !== 'undefined') throw new ApiError(readOnlyMessage, 403);
  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      cache: 'no-store',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      // FormData : le navigateur pose lui-même l'en-tête multipart (avec la boundary).
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(`API injoignable (${baseUrl()}). Vérifiez que le serveur NestJS est démarré.`, 0);
  }
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(payload?.message) ? payload.message.join(' · ') : (payload?.message ?? res.statusText);
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  dashboard: () => request<DashboardKpis>('GET', '/kpis/dashboard'),

  articles: (query: { q?: string; origin?: ArticleOrigin; alertOnly?: boolean } = {}) =>
    request<Article[]>('GET', '/articles', { query }),
  createArticle: (body: CreateArticleInput) => request<Article>('POST', '/articles', { body }),

  zones: () => request<Zone[]>('GET', '/zones'),
  zone: (id: number) => request<ZoneDetail>('GET', `/zones/${id}`),
  racks: (zoneId?: number) => request<Rack[]>('GET', '/racks', { query: { zoneId } }),

  storekeepers: () => request<StorekeeperSummary[]>('GET', '/storekeepers'),
  planning: (from?: string, weeks?: number) => request<PlanningView>('GET', '/shifts', { query: { from, weeks } }),
  setShift: (body: { storekeeperId: number; weekStart: string; type?: ShiftType | null; locked?: boolean }) =>
    request<unknown>('PUT', '/shifts', { body }),
  extendRotation: (weeks: number) => request<{ created: number; from: string; to: string }>('POST', '/shifts/extend', { body: { weeks } }),
  currentShifts: () => request<CurrentAssignment>('GET', '/shifts/current'),

  receptions: () => request<Reception[]>('GET', '/receptions'),
  createReception: (body: CreateReceptionInput) => request<Reception>('POST', '/receptions', { body }),

  expeditions: () => request<Expedition[]>('GET', '/expeditions'),
  createExpedition: (body: CreateExpeditionInput) => request<Expedition>('POST', '/expeditions', { body }),
  updateExpeditionStatus: (id: number, status: ExpeditionStatus) =>
    request<Expedition>('PATCH', `/expeditions/${id}/status`, { body: { status } }),

  movements: (type?: MovementType) => request<Movement[]>('GET', '/movements', { query: { type } }),
  movementSummary: () => request<MovementSummary>('GET', '/movements/summary'),

  audits: (year?: number, month?: number) => request<Audit[]>('GET', '/audits', { query: { year, month } }),
  inventoryKpis: () => request<InventoryKpis>('GET', '/audits/kpis'),

  settings: () => request<Settings>('GET', '/settings'),
  updateSettings: (body: UpdateSettingsInput) => request<Settings>('PATCH', '/settings', { body }),

  profiles: () => request<ProfileView[]>('GET', '/profiles'),
  createProfile: (body: ProfileInput) => request<ProfileView>('POST', '/profiles', { body }),
  updateProfile: (id: number, body: Partial<ProfileInput>) => request<ProfileView>('PATCH', `/profiles/${id}`, { body }),

  stockSheetOptions: () => request<SheetOptions>('GET', '/stock-sheets/options'),
  stockSheets: (limit = 20) => request<StockSheet[]>('GET', '/stock-sheets', { query: { limit } }),
  createStockSheet: (input: CreateStockSheetInput) => {
    const form = new FormData();
    const { photos, ...fields } = input;
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, String(v));
    for (const p of photos) form.append('photos', p);
    return request<StockSheet>('POST', '/stock-sheets', { form });
  },

  // ───── Personnel ─────
  storekeeper: (id: number) => request<StorekeeperProfile>('GET', `/storekeepers/${id}`),
  createStorekeeper: (body: StorekeeperInput) => request<Storekeeper>('POST', '/storekeepers', { body }),
  updateStorekeeper: (id: number, body: Partial<StorekeeperInput> & { fixedPost?: ShiftType | null }) =>
    request<Storekeeper>('PATCH', `/storekeepers/${id}`, { body }),
  addTraining: (id: number, fields: Record<string, string | number | undefined>, file?: File | null) =>
    request<TrainingView>('POST', `/storekeepers/${id}/trainings`, { form: toForm(fields, file) }),
  removeTraining: (id: number) => request<void>('DELETE', `/trainings/${id}`),
  addHabilitation: (id: number, fields: Record<string, string | number | undefined>, file?: File | null) =>
    request<HabilitationView>('POST', `/storekeepers/${id}/habilitations`, { form: toForm(fields, file) }),
  updateHabilitation: (id: number, body: { reference?: string; organization?: string; obtainedAt?: string; expiresAt?: string }) =>
    request<HabilitationView>('PATCH', `/habilitations/${id}`, { body }),
  removeHabilitation: (id: number) => request<void>('DELETE', `/habilitations/${id}`),
  habilitationAlerts: () => request<HabilitationAlert[]>('GET', '/habilitations/alerts'),
  habilitationTypes: () => request<HabilitationTypeView[]>('GET', '/habilitation-types'),
  createHabilitationType: (body: { name: string; description?: string; validityMonths: number }) =>
    request<unknown>('POST', '/habilitation-types', { body }),
  updateHabilitationType: (id: number, body: { name?: string; description?: string; validityMonths?: number }) =>
    request<unknown>('PATCH', `/habilitation-types/${id}`, { body }),
  removeHabilitationType: (id: number) => request<void>('DELETE', `/habilitation-types/${id}`),

  // ───── Engins ─────
  engins: () => request<Engin[]>('GET', '/engins'),
  engin: (id: number) => request<EnginDetail>('GET', `/engins/${id}`),
  enginOptions: () => request<EnginOptions>('GET', '/engins/options'),
  enginAlerts: () => request<EnginAlert[]>('GET', '/engins/alerts'),
  createEngin: (body: EnginInput) => request<EnginDetail>('POST', '/engins', { body }),
  updateEngin: (id: number, body: Partial<EnginInput>) => request<EnginDetail>('PATCH', `/engins/${id}`, { body }),
  setEnginPhoto: (id: number, photo: File) => {
    const form = new FormData();
    form.append('photo', photo);
    return request<EnginDetail>('POST', `/engins/${id}/photo`, { form });
  },
  setEnginStatus: (id: number, status: EnginStatus) => request<EnginDetail>('PATCH', `/engins/${id}/status`, { body: { status } }),
  addMaintenance: (
    id: number,
    fields: { type: MaintenanceType; date: string; endDate?: string; hourMeter?: number; description: string; partsReplaced?: string; cost?: number; provider?: string; result?: string },
    file?: File | null,
  ) => request<EnginDetail>('POST', `/engins/${id}/maintenance`, { form: toForm(fields, file) }),
  declareBreakdown: (id: number, body: { description: string; date?: string; hourMeter?: number }) =>
    request<EnginDetail>('POST', `/engins/${id}/breakdown`, { body }),
  closeMaintenance: (recordId: number, body: { endDate?: string; cost?: number; partsReplaced?: string; provider?: string }) =>
    request<EnginDetail>('POST', `/maintenance/${recordId}/close`, { body }),
  addEnginCheck: (
    id: number,
    body: { storekeeperId?: number; operatorName?: string; hourMeter?: number; items: { key: string; ok: boolean }[]; comment?: string; stopEngin?: boolean },
  ) => request<EnginDetail>('POST', `/engins/${id}/checks`, { body }),

  // ───── Équipes support & prestations ─────
  interventions: (status?: InterventionStatus) => request<InterventionSummary[]>('GET', '/interventions', { query: { status } }),
  intervention: (id: number) => request<InterventionDetail>('GET', `/interventions/${id}`),
  interventionOptions: () => request<{ workTypes: string[] }>('GET', '/interventions/options'),
  createIntervention: (body: InterventionInput) => request<InterventionDetail>('POST', '/interventions', { body }),
  updateIntervention: (id: number, body: Partial<InterventionInput> & { status?: InterventionStatus; actualStart?: string | null; actualEnd?: string | null }) =>
    request<InterventionDetail>('PATCH', `/interventions/${id}`, { body }),
  removeIntervention: (id: number) => request<void>('DELETE', `/interventions/${id}`),
  addMember: (id: number, body: { name: string; role: string; company?: string; phone?: string }) =>
    request<InterventionDetail>('POST', `/interventions/${id}/members`, { body }),
  removeMember: (memberId: number) => request<InterventionDetail>('DELETE', `/intervention-members/${memberId}`),
  addTask: (id: number, body: TaskInput) => request<InterventionDetail>('POST', `/interventions/${id}/tasks`, { body }),
  updateTask: (taskId: number, body: Partial<TaskInput> & { progress?: number; status?: TaskStatus }) =>
    request<InterventionDetail>('PATCH', `/intervention-tasks/${taskId}`, { body }),
  removeTask: (taskId: number) => request<InterventionDetail>('DELETE', `/intervention-tasks/${taskId}`),
  addLog: (id: number, body: { date: string; description: string; author: string; taskId?: number; progressAfter?: number }) =>
    request<InterventionDetail>('POST', `/interventions/${id}/logs`, { body }),
  removeLog: (logId: number) => request<InterventionDetail>('DELETE', `/work-logs/${logId}`),

  setEnginChecklist: (id: number, body: { items?: { key?: string; label: string }[]; reset?: boolean }) =>
    request<EnginDetail>('PATCH', `/engins/${id}/checklist`, { body }),
  loadDemoEngins: () => request<{ created: number }>('POST', '/engins/demo'),

  // ───── Saisie d'inventaire ─────
  inventoryOptions: () => request<InventoryOptions>('GET', '/inventory/options'),
  searchReferential: (q: string) => request<ReferentialItem[]>('GET', '/inventory/referential', { query: { q } }),
  inventoryCounts: () => request<InventoryCount[]>('GET', '/inventory/counts'),
  /** Fiche de comptage + une photo par ligne (même ordre que les lignes) */
  createInventoryCount: (
    body: { storekeeperId: number; countedAt: string; post: ShiftType; location?: string; comment?: string; lines: CountLineInput[] },
    photos: File[],
  ) => {
    const form = new FormData();
    form.append('data', JSON.stringify(body));
    for (const p of photos) form.append('photos', p);
    return request<InventoryCount>('POST', '/inventory/counts', { form });
  },
  designationRequests: () => request<DesignationRequest[]>('GET', '/inventory/requests'),
  linkCountLine: (lineId: number, articleId: number, resolvedBy: string) =>
    request<void>('POST', `/inventory/lines/${lineId}/link`, { body: { articleId, resolvedBy } }),
  createArticleFromLine: (
    lineId: number,
    body: { code: string; designation: string; category: ArticleCategory; zoneId: number; rackLocation?: string; minStock?: number; unitCostCMP?: number; abcClass?: AbcClass; resolvedBy: string },
  ) => request<void>('POST', `/inventory/lines/${lineId}/create-article`, { body }),
  rejectCountLine: (lineId: number, resolvedBy: string, reason?: string) =>
    request<void>('POST', `/inventory/lines/${lineId}/reject`, { body: { resolvedBy, reason } }),
  pendingValidations: () => request<PendingValidation[]>('GET', '/inventory/pending'),
  validateArticleCount: (articleId: number, resolvedBy: string) =>
    request<{ gap: number; movementNumber: string | null; stockAfter: number }>('POST', `/inventory/articles/${articleId}/validate`, { body: { resolvedBy } }),
  rejectArticleCount: (articleId: number, resolvedBy: string, reason?: string) =>
    request<void>('POST', `/inventory/articles/${articleId}/reject`, { body: { resolvedBy, reason } }),

  /** Suppression générique (bouton de confirmation) */
  remove: (path: string) => request<void>('DELETE', path),
};

/** Formulaire multipart : champs non vides + fichier optionnel (champ `file`) */
function toForm(fields: Record<string, string | number | undefined>, file?: File | null): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== '') form.append(k, String(v));
  if (file) form.append('file', file);
  return form;
}

/** URL absolue d'un fichier ou d'un export servi par l'API (navigateur) */
export const apiUrl = (path: string): string => new URL(path, PUBLIC_API_URL).toString();

/** URL absolue d'un fichier servi par l'API (ex. photo `/uploads/…`) */
export const assetUrl = (path: string): string => new URL(path, PUBLIC_API_URL).toString();
