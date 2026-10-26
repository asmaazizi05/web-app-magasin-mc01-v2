/**
 * Référentiel du parc engins : types proposés, énergies, check-lists de prise de poste par famille d'engin
 * et seuils d'alerte. Les types restent en saisie libre (on peut en ajouter d'autres).
 */

export const ENGIN_TYPES = [
  'Chariot élévateur',
  'Chariot à mât rétractable',
  'Gerbeur',
  'Transpalette électrique',
  'Transpalette manuel',
  'Nacelle ciseaux',
  'Nacelle articulée',
  'Nacelle télescopique',
  'Pont roulant',
  'Chargeuse',
  'Camion / porteur',
  'Autre',
];

export const ENERGIES = ['Électrique', 'Diesel', 'Gaz (GPL)', 'Essence', 'Manuel'];
export const USAGES = ['Intérieur', 'Extérieur', 'Intérieur / Extérieur'];
export const INSPECTION_RESULTS = ['Conforme', 'Avec réserves', 'Non conforme'];

// Alerte « bientôt » (N jours / N heures de compteur) : réglable, voir common/alert-config.ts

/** Famille d'engin : détermine les caractéristiques techniques affichées et la check-list */
export type EnginFamily = 'FOURCHES' | 'NACELLE' | 'PONT' | 'ROULANT';

export function enginFamily(type: string): EnginFamily {
  const t = type.toLowerCase();
  if (t.includes('nacelle')) return 'NACELLE';
  if (t.includes('pont') || t.includes('palan') || t.includes('portique')) return 'PONT';
  if (t.includes('chariot') || t.includes('gerbeur') || t.includes('transpalette')) return 'FOURCHES';
  return 'ROULANT';
}

export interface ChecklistItem {
  key: string;
  label: string;
}

const VEHICLE: ChecklistItem[] = [
  { key: 'freins', label: 'Freins de service et de stationnement' },
  { key: 'direction', label: 'Direction' },
  { key: 'klaxon', label: 'Klaxon / avertisseur de recul' },
  { key: 'feux', label: 'Feux / gyrophare' },
  { key: 'pneus', label: 'Pneus / roues' },
  { key: 'fuites', label: 'Absence de fuites (huile, hydraulique)' },
  { key: 'energie', label: 'Niveau batterie / carburant' },
];

const CHECKLISTS: Record<EnginFamily, ChecklistItem[]> = {
  FOURCHES: [
    ...VEHICLE,
    { key: 'fourches', label: 'Fourches et tablier (fissures, usure)' },
    { key: 'mat', label: 'Mât, chaînes et vérins' },
    { key: 'retenue', label: 'Ceinture / dispositif de retenue' },
    { key: 'protege', label: 'Protège-conducteur' },
  ],
  NACELLE: [
    ...VEHICLE,
    { key: 'gardecorps', label: 'Garde-corps et portillon' },
    { key: 'urgence', label: "Arrêts d'urgence (plateforme et sol)" },
    { key: 'secours', label: 'Descente de secours' },
    { key: 'commandes', label: 'Commandes plateforme / sol' },
    { key: 'devers', label: 'Alarme de dévers / surcharge' },
    { key: 'ancrage', label: "Points d'ancrage harnais" },
  ],
  PONT: [
    { key: 'crochet', label: 'Crochet et linguet de sécurité' },
    { key: 'cable', label: 'Câble / chaîne de levage' },
    { key: 'finscourse', label: 'Fins de course (montée / descente / translation)' },
    { key: 'commande', label: 'Télécommande / boîte à boutons' },
    { key: 'urgence', label: "Arrêt d'urgence" },
    { key: 'frein', label: 'Frein de levage' },
    { key: 'avertisseur', label: 'Avertisseur sonore / lumineux' },
  ],
  ROULANT: [...VEHICLE, { key: 'ceinture', label: 'Ceinture de sécurité' }, { key: 'retros', label: 'Rétroviseurs' }],
};

export const checklistFor = (type: string): ChecklistItem[] => CHECKLISTS[enginFamily(type)];
