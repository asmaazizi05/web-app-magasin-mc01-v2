/**
 * Données de référence (catalogue d'habilitations, engins connus).
 * Idempotent : n'ajoute que ce qui manque, ne modifie jamais une ligne existante.
 * Appelé par le seed ; exécutable seul sur une base en service : `pnpm --filter api exec tsx prisma/reference-data.ts`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/** Habilitations courantes sur site industriel (durée de validité usuelle en mois) — modifiables dans Paramètres */
export const HABILITATION_TYPES: { name: string; description: string; validityMonths: number }[] = [
  { name: 'CACES R489 – Chariots élévateurs', description: 'Conduite de chariots élévateurs à conducteur porté (cat. 1A, 1B, 3, 5…)', validityMonths: 60 },
  { name: 'CACES R485 – Gerbeurs', description: 'Gerbeurs à conducteur accompagnant', validityMonths: 60 },
  { name: 'CACES R486 – Nacelles (PEMP)', description: 'Plates-formes élévatrices mobiles de personnes', validityMonths: 60 },
  { name: 'CACES R484 – Ponts roulants', description: 'Ponts roulants et portiques', validityMonths: 60 },
  { name: 'Élingage et levage de charges', description: 'Élingueur / chef de manœuvre', validityMonths: 36 },
  { name: 'Habilitation électrique B0 / H0V', description: 'Non-électricien travaillant à proximité d\'installations électriques', validityMonths: 36 },
  { name: 'Travail en hauteur', description: 'Port du harnais et des EPI antichute', validityMonths: 36 },
  { name: 'Intervention en espace confiné', description: 'Cuves, fosses, trémies', validityMonths: 36 },
  { name: 'SST – Sauveteur Secouriste du Travail', description: 'Premiers secours (recyclage obligatoire)', validityMonths: 24 },
  { name: 'Équipier de première intervention (incendie)', description: 'Manipulation des extincteurs, évacuation', validityMonths: 12 },
];

export async function ensureReferenceData(prisma: PrismaClient): Promise<{ types: number; engins: number }> {
  let types = 0;
  for (const [position, t] of HABILITATION_TYPES.entries()) {
    const exists = await prisma.habilitationType.findUnique({ where: { name: t.name } });
    if (!exists) {
      await prisma.habilitationType.create({ data: { ...t, position } });
      types++;
    }
  }

  // Seul engin connu à ce jour (plan du hangar) ; le parc complet se saisit dans « Parc engins »
  let engins = 0;
  if (!(await prisma.engin.findUnique({ where: { code: 'ENG-01' } }))) {
    const caces = await prisma.habilitationType.findUnique({ where: { name: HABILITATION_TYPES[0].name } });
    await prisma.engin.create({
      data: { code: 'ENG-01', name: 'Chariot élévateur 85x200', type: 'Chariot élévateur', requiredHabilitationTypeId: caces?.id },
    });
    engins++;
  }
  return { types, engins };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  ensureReferenceData(prisma)
    .then((r) => console.log(`Données de référence : ${r.types} type(s) d'habilitation et ${r.engins} engin(s) ajouté(s).`))
    .finally(() => prisma.$disconnect());
}
