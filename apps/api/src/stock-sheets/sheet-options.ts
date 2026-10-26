import { MovementType, ShiftType } from '@prisma/client';

/**
 * Listes de choix de la fiche « Mouvements de stock (E/S) » (formulaire Google Forms du magasin).
 * Source unique : validation API + affichage du formulaire + import des exports Google Sheet.
 *
 * ✅ = valeur constatée dans l'export réel du formulaire (02/10/2026).
 * ⚠️ = valeur supposée, à confirmer avec le formulaire officiel.
 */
export const SHEET_CATEGORIES = [
  'Mécanique', // ✅
  'Électrique & Instrumentation', // ✅
  'Tuyauterie et robinetterie', // ✅
  'Boulonnerie et visserie', // ✅
  'Tôlerie / métallique (tôles, cornières)', // ✅
  'Étanchéité / joints / garniture (tresses, joints)', // ✅
  'Lubrifiants, graisses', // ✅
  'Outillage', // ⚠️
  'Consommables', // ⚠️
  'EPI (Équipements de Protection Individuelle)', // ⚠️
  'Divers', // ⚠️
] as const;

export const SHEET_UNITS = [
  'U', // ✅ unité
  'KG', // ✅
  'ML', // ⚠️ mètre linéaire
  'L', // ⚠️ litre
] as const;

export const SHEET_REQUESTER_TYPES = ['JESA Maintenance', 'OCP'] as const; // ✅

export const SHEET_TYPES: { value: MovementType; label: string }[] = [
  { value: MovementType.IN, label: 'Entrée' }, // ✅
  { value: MovementType.OUT, label: 'Sorties' }, // ✅
];

/** « 1 poste », « 2 poste » ✅ ; « 3 poste », « Poste normal » ⚠️ */
export const SHEET_POSTS: { value: ShiftType; label: string }[] = [
  { value: ShiftType.MATIN, label: '1 poste (06:00 - 14:00)' },
  { value: ShiftType.APRES_MIDI, label: '2 poste (14:00 - 22:00)' },
  { value: ShiftType.NUIT, label: '3 poste (22:00 - 06:00)' },
  { value: ShiftType.OFF, label: 'Poste normal (08:00 - 16:30)' },
];

/**
 * Sorties : zone de destination et secteurs connus de chaque zone.
 * Les secteurs listés sont ceux constatés dans l'export ; le formulaire accepte aussi une saisie libre.
 */
export const SHEET_DEST_ZONES: Record<string, string[]> = {
  LAVERIE: [
    '120 - RB1',
    '160 - Mise à terril D',
    '210 - Débourbage et criblage',
    '320 - Conditionnement et flottation',
    '410 - Épaississage',
    '520 - Eau brute',
  ],
  TREMIE: ['HHI'],
  LIAISON: [],
};

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
