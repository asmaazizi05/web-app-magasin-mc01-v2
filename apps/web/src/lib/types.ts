// Types des réponses de l'API NestJS (dates sérialisées en chaînes ISO).

export type AbcClass = 'A' | 'B' | 'C';
export type ArticleCategory = 'MECANIQUE' | 'TUYAUTERIE' | 'OUTILLAGE' | 'ELECTRIQUE' | 'CONSOMMABLES';
export type ArticleOrigin = 'JESA' | 'OCP' | 'CESSION' | 'ANNEXE_D';
export type PurchaseScope = 'OCP' | 'CESSION' | 'JESA' | 'ANNEXE_D';
export type InventoryLineStatus = 'A_VALIDER' | 'DEMANDE_DESIGNATION' | 'VALIDEE' | 'REJETEE';
export type AlertStatus = 'CRITIQUE' | 'LIMITE' | 'CONFORME';
export type RackStatus = AlertStatus | 'VIDE';
export type ZoneType = 'HANGAR' | 'ABRI' | 'EXTERIEUR' | 'MODULAIRE';
export type ShiftType = 'MATIN' | 'APRES_MIDI' | 'NUIT' | 'OFF' | 'CONGE' | 'FORMATION' | 'ABSENT';
export type HabilitationStatus = 'VALIDE' | 'BIENTOT' | 'EXPIREE';
export type EnginStatus = 'DISPONIBLE' | 'MAINTENANCE' | 'EN_PANNE' | 'HORS_SERVICE';
export type EnginOwnership = 'PROPRE' | 'LOCATION';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'PANNE' | 'CONTROLE_PERIODIQUE';
export type DueStatus = 'OK' | 'BIENTOT' | 'EN_RETARD' | 'A_PLANIFIER' | 'NON_PLANIFIE';
export type EnginFamily = 'FOURCHES' | 'NACELLE' | 'PONT' | 'ROULANT';
export type ProviderKind = 'PRESTATAIRE' | 'SUPPORT_INTERNE';
export type InterventionStatus = 'PLANIFIEE' | 'EN_COURS' | 'SUSPENDUE' | 'TERMINEE' | 'CLOTUREE';
export type TaskStatus = 'A_FAIRE' | 'EN_COURS' | 'BLOQUEE' | 'TERMINEE';
export type ReceptionStatus = 'VALIDE' | 'CONTROLE_QUALITE';
export type ExpeditionPriority = 'URGENT' | 'HAUTE' | 'NORMALE';
export type ExpeditionStatus = 'EN_ATTENTE' | 'EN_PICKING' | 'LIVRE' | 'ANNULE';
export type MovementType = 'IN' | 'OUT';
export type AuditStatus = 'TERMINE' | 'PLANIFIE' | 'A_VENIR';

export interface ArticleRef {
  id: number;
  code: string;
  designation: string;
}

export interface StorekeeperRef {
  id: number;
  matricule: string;
  name: string;
}

export interface Article {
  id: number;
  code: string;
  designation: string;
  category: ArticleCategory;
  origin: ArticleOrigin;
  originLabel: string;
  zoneId: number;
  zoneName: string;
  rackId: number | null;
  rackCode: string | null;
  rackLevel: number | null;
  rackLocation: string;
  currentStock: number;
  minStock: number;
  unitCostCMP: number;
  stockValue: number;
  abcClass: AbcClass;
  alertStatus: AlertStatus;
  updatedAt: string;
}

export interface Zone {
  id: number;
  code: string;
  position: number;
  name: string;
  category: string;
  description: string;
  planTitle: string;
  planSubtitle: string;
  type: ZoneType;
  capacity: number;
  areaM2: number | null;
  articleCount: number;
  units: number;
  remaining: number;
  occupancyPct: number;
  valuation: number;
}

export interface Rack {
  id: number;
  code: string;
  zoneId: number;
  aisle: number;
  aisleLabel: string;
  levels: number;
  capacity: number;
  units: number;
  saturationPct: number;
  status: RackStatus;
  articles: Article[];
}

export interface ZoneDetail extends Zone {
  racks: Rack[];
  articles: Article[];
}

export interface Storekeeper {
  id: number;
  matricule: string;
  name: string;
  role: string;
  specialty: string;
  phone: string | null;
  email: string | null;
  /** Société d'appartenance */
  company: string | null;
  /** « YYYY-MM-DD » */
  hireDate: string | null;
  /** Poste fixe (hors rotation) */
  fixedPost: ShiftType | null;
}

export interface PlanningWeek {
  weekStart: string;
  weekEnd: string;
  isoWeek: number;
  isCurrent: boolean;
}

export interface PlanningCell {
  type: ShiftType;
  locked: boolean;
}

export interface PlanningView {
  currentWeekStart: string;
  lastPlannedWeek: string | null;
  weeks: PlanningWeek[];
  rows: { storekeeper: Storekeeper; cells: Record<string, PlanningCell | null> }[];
  coverage: Record<string, Partial<Record<ShiftType, number>>>;
}

export interface CurrentAssignment {
  weekStart: string;
  posts: { type: ShiftType; storekeepers: Storekeeper[] }[];
  away: { type: ShiftType; storekeeper: Storekeeper }[];
}

export interface Reception {
  id: number;
  number: string;
  supplier: string;
  quantity: number;
  receivedAt: string;
  status: ReceptionStatus;
  article: ArticleRef;
  receiver: StorekeeperRef;
  stockAfter: number | null;
}

export interface Expedition {
  id: number;
  number: string;
  requesterService: string;
  quantity: number;
  priority: ExpeditionPriority;
  status: ExpeditionStatus;
  requestedAt: string;
  dueAt: string;
  servedAt: string | null;
  article: ArticleRef;
  preparer: StorekeeperRef | null;
  pickingPost: number | null;
}

export interface Movement {
  id: number;
  type: MovementType;
  documentNumber: string;
  date: string;
  quantity: number;
  signedQuantity: number;
  source: string | null;
  destination: string | null;
  stockAfter: number;
  article: ArticleRef;
  storekeeper: StorekeeperRef | null;
}

export interface MovementSummary {
  entries: number;
  exits: number;
  net: number;
  entryDocuments: number;
  exitDocuments: number;
}

export interface Audit {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  scope: string;
  status: AuditStatus;
  countedLines: number;
  accurateLines: number;
  countedValue: number;
  varianceValue: number;
  discrepancies: number;
  accuracyPct: number | null;
}

export interface InventoryKpis {
  ira: number;
  financialGapPct: number;
  countedLines: number;
  accurateLines: number;
  completedAudits: number;
  lastAuditDate: string | null;
}

/** Personne du sélecteur de profil et rubriques du menu qui lui sont masquées */
export interface ProfileView {
  id: number;
  name: string;
  /** Titre / poste */
  role: string;
  phone: string | null;
  email: string | null;
  admin: boolean;
  hiddenRoutes: string[];
  /** Rubriques visibles en consultation seulement */
  readOnlyRoutes: string[];
}

export type ProfileInput = Omit<ProfileView, 'id'>;

export interface Settings {
  id: number;
  siteName: string;
  siteCode: string;
  /** En-tête de l'application */
  appTitle: string;
  siteLabel: string;
  /** Valeurs proposées par défaut */
  enginInspectionMonths: number;
  rotationExtendWeeks: number;
  habilitationAlertDays: number;
  /** Stock : marge « Limite Approche » au-dessus du stock minimum (%) */
  stockLimitMarginPct: number;
  /** Engins : alerte N jours / N heures de compteur avant une échéance */
  enginAlertDays: number;
  enginAlertHours: number;
  sapSystem: string;
  sapHost: string;
  sapClient: string;
  sapPlant: string;
  sapStorageLocation: string;
  syncIntervalMinutes: number;
  autoSync: boolean;
  connected: boolean;
  lastSyncAt: string;
}

export interface AbcSlice {
  abcClass: AbcClass;
  articleCount: number;
  units: number;
  value: number;
  valueSharePct: number;
  cumulativeSharePct: number;
}

export interface CategoryFlow {
  category: ArticleCategory;
  quantity: number;
}

export interface StockAlert {
  articleId: number;
  code: string;
  designation: string;
  currentStock: number;
  minStock: number;
  rackLocation: string;
}

export interface DashboardKpis {
  totalUnits: number;
  totalValuation: number;
  articleCount: number;
  zonesWithStock: number;
  otif: { value: number; onTime: number; total: number };
  ira: { value: number; countedLines: number; accurateLines: number; lastAuditDate: string | null };
  rackSaturation: { value: number; units: number; capacity: number; rackCount: number };
  avgPrepMinutes: number | null;
  abc: AbcSlice[];
  zones: Zone[];
  alerts: StockAlert[];
  flowsByCategory: { IN: CategoryFlow[]; OUT: CategoryFlow[] };
  generatedAt: string;
}

// Corps des requêtes d'écriture
export interface CreateReceptionInput {
  supplier: string;
  articleId: number;
  quantity: number;
  receiverId: number;
  status: ReceptionStatus;
  receivedAt?: string;
}

export interface CreateExpeditionInput {
  requesterService: string;
  articleId: number;
  quantity: number;
  priority: ExpeditionPriority;
  preparerId?: number;
}

export interface CreateArticleInput {
  code: string;
  designation: string;
  category: ArticleCategory;
  origin: ArticleOrigin;
  originLabel: string;
  zoneId: number;
  rackId?: number;
  rackLevel?: number;
  currentStock: number;
  minStock: number;
  unitCostCMP: number;
  abcClass: AbcClass;
}

export type UpdateSettingsInput = Partial<
  Pick<
    Settings,
    | 'habilitationAlertDays'
    | 'appTitle'
    | 'siteLabel'
    | 'enginInspectionMonths'
    | 'rotationExtendWeeks'
    | 'stockLimitMarginPct'
    | 'enginAlertDays'
    | 'enginAlertHours'
    | 'sapSystem'
    | 'sapHost'
    | 'sapClient'
    | 'sapPlant'
    | 'sapStorageLocation'
    | 'syncIntervalMinutes'
    | 'autoSync'
  >
>;

// Fiche « Mouvements de stock (E/S) »
export interface SheetOptions {
  types: { value: MovementType; label: string }[];
  categories: string[];
  units: string[];
  requesterTypes: string[];
  posts: { value: ShiftType; label: string }[];
  destinationZones: Record<string, string[]>;
  maxPhotos: number;
}

export interface StockSheet {
  id: number;
  type: MovementType;
  date: string;
  designation: string;
  category: string;
  quantity: number;
  unit: string;
  requesterType: string;
  requesterName: string;
  post: ShiftType;
  supplier: string | null;
  destinationZone: string | null;
  destinationArea: string | null;
  article: ArticleRef;
  storekeeper: StorekeeperRef;
  documentNumber: string;
  stockAfter: number | null;
  /** `/uploads/…` servi par l'API ou lien externe (Google Drive) */
  photos: { id: number; url: string; external: boolean; originalName: string }[];
  /** Fiche importée d'un export Google Sheet */
  imported: boolean;
  createdAt: string;
}

export interface CreateStockSheetInput {
  type: MovementType;
  date: string;
  designation: string;
  articleId: number;
  category: string;
  quantity: number;
  unit: string;
  requesterType: string;
  requesterName: string;
  storekeeperId: number;
  post: ShiftType;
  supplier?: string;
  destinationZone?: string;
  destinationArea?: string;
  photos: File[];
}

// ───────────── Personnel ─────────────

export interface StorekeeperSummary extends Storekeeper {
  currentPost: ShiftType | null;
  habilitations: { valid: number; soon: number; expired: number };
  nextExpiry: { typeName: string; expiresAt: string; status: HabilitationStatus } | null;
  trainingCount: number;
}

export interface HabilitationView {
  id: number;
  storekeeperId: number;
  typeId: number;
  typeName: string;
  reference: string | null;
  organization: string | null;
  obtainedAt: string;
  expiresAt: string;
  status: HabilitationStatus;
  daysLeft: number;
  superseded: boolean;
  documentUrl: string | null;
  documentName: string | null;
}

export interface HabilitationAlert extends HabilitationView {
  storekeeperName: string;
  matricule: string;
}

export interface TrainingView {
  id: number;
  title: string;
  organization: string | null;
  date: string;
  durationHours: number | null;
  documentUrl: string | null;
  documentName: string | null;
}

export interface StorekeeperProfile extends StorekeeperSummary {
  upcoming: { weekStart: string; type: ShiftType | null; locked: boolean }[];
  habilitationList: HabilitationView[];
  trainings: TrainingView[];
  engins: { id: number; code: string; name: string; requiredHabilitation: string | null; allowed: boolean }[];
}

export interface HabilitationTypeView {
  id: number;
  name: string;
  description: string | null;
  validityMonths: number;
  position: number;
  usage: number;
}

export interface StorekeeperInput {
  matricule: string;
  name: string;
  role: string;
  specialty: string;
  phone?: string;
  email?: string | null;
  company?: string | null;
  hireDate?: string;
}

// ───────────── Engins ─────────────

export interface EnginAlert {
  enginId: number;
  code: string;
  name: string;
  severity: 'critique' | 'attention';
  message: string;
}

/** Caractéristiques saisissables d'un engin (formulaire) */
export interface EnginInput {
  name: string;
  type: string;
  status?: EnginStatus;
  requiredHabilitationTypeId?: number | null;
  brand?: string;
  model?: string;
  serialNumber?: string;
  reference?: string;
  commissioningYear?: number;
  ownership?: EnginOwnership;
  ownerService?: string;
  rentalCompany?: string;
  rentalEndDate?: string | null;
  energy?: string;
  capacityKg?: number;
  weightKg?: number;
  liftHeightM?: number;
  workingHeightM?: number;
  forkLengthMm?: number;
  batteryVoltage?: number;
  batteryCapacityAh?: number;
  maxPersons?: number;
  usage?: string;
  dimensions?: string;
  notes?: string;
  hourMeter?: number;
  serviceIntervalHours?: number;
  serviceIntervalMonths?: number;
  lastServiceDate?: string | null;
  lastServiceHours?: number;
  inspectionIntervalMonths?: number;
  lastInspectionDate?: string | null;
}

export interface Engin {
  id: number;
  code: string;
  name: string;
  type: string;
  family: EnginFamily;
  status: EnginStatus;
  photoUrl: string | null;
  isDemo: boolean;
  requiredHabilitationTypeId: number | null;
  requiredHabilitation: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  reference: string | null;
  commissioningYear: number | null;
  ownership: EnginOwnership;
  ownerService: string | null;
  rentalCompany: string | null;
  rentalEndDate: string | null;
  energy: string | null;
  capacityKg: number | null;
  weightKg: number | null;
  liftHeightM: number | null;
  workingHeightM: number | null;
  forkLengthMm: number | null;
  batteryVoltage: number | null;
  batteryCapacityAh: number | null;
  maxPersons: number | null;
  usage: string | null;
  dimensions: string | null;
  notes: string | null;
  hourMeter: number | null;
  hourMeterAt: string | null;
  serviceIntervalHours: number | null;
  serviceIntervalMonths: number | null;
  lastServiceDate: string | null;
  lastServiceHours: number | null;
  inspectionIntervalMonths: number;
  lastInspectionDate: string | null;
  nextService: { date: string | null; hours: number | null; status: DueStatus };
  nextInspection: { date: string | null; status: DueStatus };
  rental: { daysLeft: number; status: DueStatus } | null;
  openIssue: { id: number; type: MaintenanceType; date: string; description: string } | null;
  alerts: EnginAlert[];
  activeTasks: { taskId: number; title: string; interventionId: number; interventionCode: string; plannedStart: string; plannedEnd: string }[];
}

export interface MaintenanceRecord {
  id: number;
  type: MaintenanceType;
  date: string;
  endDate: string | null;
  downtimeDays: number | null;
  hourMeter: number | null;
  description: string;
  partsReplaced: string | null;
  cost: number | null;
  provider: string | null;
  result: string | null;
  documentUrl: string | null;
  documentName: string | null;
}

export interface EnginCheck {
  id: number;
  date: string;
  operatorName: string;
  hourMeter: number | null;
  allOk: boolean;
  failed: string[];
  comment: string | null;
}

export interface EnginDetail extends Engin {
  maintenance: MaintenanceRecord[];
  checks: EnginCheck[];
  checklist: { key: string; label: string }[];
  checklistCustom: boolean;
  kpis: { availability90: number; breakdowns12m: number; cost12m: number; costTotal: number; downtimeDays90: number };
}

export interface EnginOptions {
  types: string[];
  energies: string[];
  usages: string[];
  inspectionResults: string[];
}

// ───────────── Équipes support & prestations ─────────────

export interface InterventionSummary {
  id: number;
  code: string;
  title: string;
  workType: string;
  providerKind: ProviderKind;
  company: string;
  managerName: string;
  managerPhone: string | null;
  zone: { id: number; name: string } | null;
  description: string | null;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: InterventionStatus;
  progress: number;
  late: boolean;
  taskCount: number;
  doneTasks: number;
  memberCount: number;
  warningCount: number;
}

export interface InterventionTask {
  id: number;
  title: string;
  description: string | null;
  plannedStart: string;
  plannedEnd: string;
  progress: number;
  status: TaskStatus;
  late: boolean;
  members: { id: number; name: string }[];
  engins: { id: number; code: string; name: string; status: EnginStatus }[];
  warnings: string[];
}

export interface InterventionMember {
  id: number;
  name: string;
  role: string;
  company: string | null;
  phone: string | null;
  taskCount: number;
}

export interface WorkLog {
  id: number;
  date: string;
  description: string;
  author: string;
  progressAfter: number | null;
  task: { id: number; title: string } | null;
}

export interface InterventionDetail extends InterventionSummary {
  members: InterventionMember[];
  tasks: InterventionTask[];
  logs: WorkLog[];
}

export interface InterventionInput {
  title: string;
  workType: string;
  providerKind: ProviderKind;
  company: string;
  managerName: string;
  managerPhone?: string;
  zoneId: number | null;
  description?: string;
  plannedStart: string;
  plannedEnd: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  plannedStart: string;
  plannedEnd: string;
  memberIds: number[];
  enginIds: number[];
}

// ───────────── Saisie d'inventaire ─────────────

export interface ReferentialItem {
  id: number;
  code: string;
  designation: string;
  zoneName: string;
  rackLocation: string;
  /** Catégorie proposée (fiches Mouvements, sinon catalogue) */
  category: string;
}

export interface CountLine {
  id: number;
  article: { id: number; code: string; designation: string } | null;
  enteredReference: string | null;
  enteredDesignation: string | null;
  quantity: number;
  unit: string;
  purchaseScope: PurchaseScope;
  category: string | null;
  photoUrl: string | null;
  status: InventoryLineStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  rejectReason: string | null;
  stockBefore: number | null;
  stockAfter: number | null;
  movementNumber: string | null;
}

export interface InventoryCount {
  id: number;
  number: string;
  countedAt: string;
  location: string | null;
  post: ShiftType | null;
  comment: string | null;
  storekeeper: { id: number; name: string; matricule: string };
  createdAt: string;
  lines: CountLine[];
}

export interface DesignationRequest extends CountLine {
  count: { id: number; number: string; countedAt: string; location: string | null; storekeeperName: string };
  suggestions: (ReferentialItem & { score: number })[];
}

export interface PendingValidation {
  article: { id: number; code: string; designation: string; currentStock: number; unitCostCMP: number; rackLocation: string };
  lines: (CountLine & { countNumber: string; storekeeperName: string; countedAt: string; location: string | null })[];
  counted: number;
  gap: number;
  gapValue: number;
}

export interface InventoryOptions {
  units: string[];
  purchaseScopes: { value: PurchaseScope; label: string }[];
}

export interface CountLineInput {
  articleId?: number;
  enteredReference?: string;
  enteredDesignation?: string;
  quantity: number;
  unit: string;
  purchaseScope: PurchaseScope;
  category: string;
}
