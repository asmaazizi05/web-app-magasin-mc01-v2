import type {
  AlertStatus,
  InventoryLineStatus,
  DueStatus,
  EnginFamily,
  EnginStatus,
  MaintenanceType,
  HabilitationStatus,
  InterventionStatus,
  ProviderKind,
  TaskStatus,
  ArticleCategory,
  ArticleOrigin,
  AuditStatus,
  ExpeditionPriority,
  ExpeditionStatus,
  ReceptionStatus,
  ShiftType,
} from './types';

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'gray' | 'jesa';

export const ALERT_LABEL: Record<AlertStatus, { label: string; tone: Tone }> = {
  CRITIQUE: { label: 'ALERTE REAPPRO', tone: 'red' },
  LIMITE: { label: 'Limite Approche', tone: 'amber' },
  CONFORME: { label: 'Conforme', tone: 'green' },
};

export const ORIGIN_LABEL: Record<ArticleOrigin, { filter: string; tone: Tone }> = {
  JESA: { filter: 'JESA', tone: 'blue' },
  OCP: { filter: 'OCP', tone: 'green' },
  CESSION: { filter: 'Cession Intra-Site OCP', tone: 'purple' },
  ANNEXE_D: { filter: 'Annexe D (PDR projet)', tone: 'amber' },
};

export const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  MECANIQUE: 'Mécanique (Vannes,SKF)',
  TUYAUTERIE: 'Tuyauterie & Acier',
  OUTILLAGE: 'Outillage & Mesure',
  ELECTRIQUE: 'Électrique & Relais',
  CONSOMMABLES: 'Consommables',
};

/** Couleur fixe par catégorie : la couleur suit l'entité, jamais son rang. */
export const CATEGORY_COLOR: Record<ArticleCategory, string> = {
  MECANIQUE: '#3B82F6',
  TUYAUTERIE: '#00A859',
  OUTILLAGE: '#F59E0B',
  ELECTRIQUE: '#A855F7',
  CONSOMMABLES: '#64748B',
};

export const RECEPTION_STATUS: Record<ReceptionStatus, { label: string; tone: Tone }> = {
  VALIDE: { label: 'Validé SAP', tone: 'green' },
  CONTROLE_QUALITE: { label: 'Contrôle Qualité', tone: 'amber' },
};

export const PRIORITY: Record<ExpeditionPriority, { label: string; tone: Tone }> = {
  URGENT: { label: 'Urgent', tone: 'red' },
  HAUTE: { label: 'Haute', tone: 'amber' },
  NORMALE: { label: 'Normale', tone: 'gray' },
};

export const EXPEDITION_STATUS: Record<ExpeditionStatus, { label: string; tone: Tone }> = {
  EN_ATTENTE: { label: 'En Attente', tone: 'amber' },
  EN_PICKING: { label: 'En Picking', tone: 'blue' },
  LIVRE: { label: 'Servi / Livré', tone: 'green' },
  ANNULE: { label: 'Annulé', tone: 'gray' },
};

export interface ShiftMeta {
  rotationLabel: string;
  cardLabel: string;
  hours: string;
  start: number;
  end: number;
  tone: Tone;
}

const h = (hh: number, mm = 0) => hh * 60 + mm;

export const SHIFT: Record<ShiftType, ShiftMeta> = {
  MATIN: { rotationLabel: 'Poste 1 (Matin)', cardLabel: '1er Poste (Matin)', hours: '06:00 - 14:00', start: h(6), end: h(14), tone: 'green' },
  APRES_MIDI: { rotationLabel: 'Poste 2 (A-M)', cardLabel: '2ème Poste (A-M)', hours: '14:00 - 22:00', start: h(14), end: h(22), tone: 'blue' },
  NUIT: { rotationLabel: 'Poste 3 (Nuit)', cardLabel: '3ème Poste (Nuit)', hours: '22:00 - 06:00', start: h(22), end: h(6), tone: 'purple' },
  OFF: { rotationLabel: 'Journée / OFF', cardLabel: 'Poste Normal / OFF', hours: '08:00 - 16:30', start: h(8), end: h(16, 30), tone: 'gray' },
  CONGE: { rotationLabel: 'Congé', cardLabel: 'Congé', hours: '—', start: 0, end: 0, tone: 'amber' },
  FORMATION: { rotationLabel: 'Formation', cardLabel: 'Formation', hours: '—', start: 0, end: 0, tone: 'jesa' },
  ABSENT: { rotationLabel: 'Absent', cardLabel: 'Absent', hours: '—', start: 0, end: 0, tone: 'red' },
};

export const AUDIT_STATUS: Record<AuditStatus, Tone> = { TERMINE: 'green', PLANIFIE: 'blue', A_VENIR: 'gray' };

/** Ordre d'affichage des postes dans le planning */
export const SHIFT_CHOICES: ShiftType[] = ['MATIN', 'APRES_MIDI', 'NUIT', 'OFF', 'CONGE', 'FORMATION', 'ABSENT'];

export const HABILITATION_STATUS: Record<HabilitationStatus, { label: string; tone: Tone }> = {
  VALIDE: { label: 'Valide', tone: 'green' },
  BIENTOT: { label: 'Expire bientôt', tone: 'amber' },
  EXPIREE: { label: 'Expirée', tone: 'red' },
};

export const ENGIN_STATUS: Record<EnginStatus, { label: string; tone: Tone }> = {
  DISPONIBLE: { label: 'Disponible', tone: 'green' },
  MAINTENANCE: { label: 'En maintenance', tone: 'amber' },
  EN_PANNE: { label: 'En panne', tone: 'red' },
  HORS_SERVICE: { label: 'Hors service', tone: 'gray' },
};

export const PROVIDER_KIND: Record<ProviderKind, { label: string; tone: Tone }> = {
  PRESTATAIRE: { label: 'Prestataire externe', tone: 'purple' },
  SUPPORT_INTERNE: { label: 'Équipe support interne', tone: 'blue' },
};

export const INTERVENTION_STATUS: Record<InterventionStatus, { label: string; tone: Tone }> = {
  PLANIFIEE: { label: 'Planifiée', tone: 'blue' },
  EN_COURS: { label: 'En cours', tone: 'jesa' },
  SUSPENDUE: { label: 'Suspendue', tone: 'amber' },
  TERMINEE: { label: 'Terminée', tone: 'green' },
  CLOTUREE: { label: 'Clôturée', tone: 'gray' },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  A_FAIRE: { label: 'À faire', tone: 'gray' },
  EN_COURS: { label: 'En cours', tone: 'blue' },
  BLOQUEE: { label: 'Bloquée', tone: 'red' },
  TERMINEE: { label: 'Terminée', tone: 'green' },
};

export const MAINTENANCE_TYPE: Record<MaintenanceType, { label: string; tone: Tone }> = {
  PREVENTIVE: { label: 'Entretien préventif', tone: 'green' },
  CORRECTIVE: { label: 'Réparation', tone: 'blue' },
  PANNE: { label: 'Panne', tone: 'red' },
  CONTROLE_PERIODIQUE: { label: 'Contrôle périodique', tone: 'purple' },
};

export const DUE_STATUS: Record<DueStatus, { label: string; tone: Tone }> = {
  OK: { label: 'À jour', tone: 'green' },
  BIENTOT: { label: 'À prévoir', tone: 'amber' },
  EN_RETARD: { label: 'En retard', tone: 'red' },
  A_PLANIFIER: { label: 'À planifier', tone: 'amber' },
  NON_PLANIFIE: { label: 'Pas de plan', tone: 'gray' },
};

/** Famille d'engin (même règle que l'API) : sert à afficher les bons champs techniques dans le formulaire */
export function enginFamily(type: string): EnginFamily {
  const t = type.toLowerCase();
  if (t.includes('nacelle')) return 'NACELLE';
  if (t.includes('pont') || t.includes('palan') || t.includes('portique')) return 'PONT';
  if (t.includes('chariot') || t.includes('gerbeur') || t.includes('transpalette')) return 'FOURCHES';
  return 'ROULANT';
}

export const COUNT_LINE_STATUS: Record<InventoryLineStatus, { label: string; tone: Tone }> = {
  A_VALIDER: { label: 'À valider', tone: 'blue' },
  DEMANDE_DESIGNATION: { label: 'Demande de désignation', tone: 'amber' },
  VALIDEE: { label: 'Validée', tone: 'green' },
  REJETEE: { label: 'Rejetée', tone: 'gray' },
};
