import { EnginOwnership, EnginStatus, MaintenanceType, PrismaClient } from '@prisma/client';
import { addDays, dayToDate, siteToday } from '../common/site-time';
import { checklistFor } from './engins.config';

/**
 * Parc engins de démonstration (marqué `isDemo`, supprimable d'un clic depuis « Parc engins »).
 * Les dates sont relatives à aujourd'hui : les alertes (retards, échéances proches, fin de location) restent parlantes.
 */

type Rec = {
  type: MaintenanceType;
  /** Jours par rapport à aujourd'hui (négatif = passé) */
  at: number;
  /** Durée en jours (absente = en cours, sauf contrôle) */
  days?: number;
  hours?: number;
  description: string;
  parts?: string;
  cost?: number;
  provider?: string;
  result?: string;
};

type Check = { at: number; operator: number; hours?: number; failed?: string[]; comment?: string };

interface DemoEngin {
  code: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  commissioningYear: number;
  ownership: EnginOwnership;
  ownerService?: string;
  rentalCompany?: string;
  rentalEndIn?: number;
  energy: string;
  capacityKg?: number;
  weightKg?: number;
  liftHeightM?: number;
  workingHeightM?: number;
  forkLengthMm?: number;
  batteryVoltage?: number;
  batteryCapacityAh?: number;
  maxPersons?: number;
  usage: string;
  dimensions?: string;
  notes?: string;
  hourMeter?: number;
  serviceIntervalHours?: number;
  serviceIntervalMonths?: number;
  lastService?: { at: number; hours?: number };
  inspectionIntervalMonths?: number;
  lastInspectionAt?: number;
  habilitation?: string;
  status?: EnginStatus;
  records: Rec[];
  checks: Check[];
}

const OCP = 'Atelier Maintenance OCP';

const DEMO: DemoEngin[] = [
  {
    code: 'ENG-D01', name: 'Chariot élévateur 2,5 t électrique', type: 'Chariot élévateur', brand: 'Linde', model: 'E25', serialNumber: 'LN-E25-H2X-77812',
    commissioningYear: 2021, ownership: 'PROPRE', ownerService: 'Magasin Central MC01', energy: 'Électrique', capacityKg: 2500, weightKg: 4300,
    liftHeightM: 4.5, forkLengthMm: 1150, batteryVoltage: 80, batteryCapacityAh: 620, usage: 'Intérieur', dimensions: '3,30 × 1,20 × 2,15 m',
    notes: 'Positionneur de fourches, gyrophare bleu, chargeur 80 V dédié (local de charge Hangar).', hourMeter: 4310,
    serviceIntervalHours: 500, serviceIntervalMonths: 12, lastService: { at: -110, hours: 4000 }, lastInspectionAt: -95, habilitation: 'R489',
    records: [
      { type: 'PREVENTIVE', at: -110, days: 1, hours: 4000, description: 'Révision 4 000 h : contrôle mât et chaînes, graissage, contrôle batterie', parts: 'Filtre hydraulique', cost: 2800, provider: 'Linde Maroc' },
      { type: 'PANNE', at: -48, days: 2, hours: 4180, description: 'Chariot ne démarre plus : contacteur de traction défectueux', parts: 'Contacteur de traction', cost: 1450, provider: OCP },
      { type: 'CONTROLE_PERIODIQUE', at: -95, description: 'Vérification générale périodique — RAS', result: 'Conforme', cost: 900, provider: 'Bureau Veritas Maroc' },
    ],
    checks: [{ at: 0, operator: 0, hours: 4310 }, { at: -1, operator: 1, hours: 4302 }, { at: -2, operator: 0, hours: 4295 }],
  },
  {
    code: 'ENG-D02', name: 'Chariot élévateur 3 t diesel', type: 'Chariot élévateur', brand: 'Toyota', model: '8FD30', serialNumber: 'TY-8FD30-30451',
    commissioningYear: 2018, ownership: 'PROPRE', ownerService: 'Maintenance OCP', energy: 'Diesel', capacityKg: 3000, weightKg: 4650, liftHeightM: 4.7,
    forkLengthMm: 1200, usage: 'Intérieur / Extérieur', hourMeter: 6120, serviceIntervalHours: 250, serviceIntervalMonths: 6,
    lastService: { at: -88, hours: 5850 }, lastInspectionAt: -186, habilitation: 'R489',
    records: [
      { type: 'PREVENTIVE', at: -88, days: 1, hours: 5850, description: 'Vidange moteur, filtres huile / gasoil / air, graissage', parts: 'Kit filtres, 12 L huile 15W40', cost: 1650, provider: OCP },
      { type: 'CORRECTIVE', at: -30, days: 3, hours: 6010, description: 'Remplacement flexible hydraulique d’inclinaison', parts: 'Flexible HP 1/2"', cost: 780, provider: OCP },
      { type: 'CONTROLE_PERIODIQUE', at: -186, description: 'VGP — RAS', result: 'Conforme', cost: 900, provider: 'Bureau Veritas Maroc' },
    ],
    checks: [{ at: -1, operator: 2, hours: 6112, failed: ['klaxon'], comment: 'Avertisseur de recul faible' }],
  },
  {
    code: 'ENG-D03', name: 'Chariot élévateur 5 t diesel — parc extérieur', type: 'Chariot élévateur', brand: 'Hyster', model: 'H5.0FT', serialNumber: 'HY-H50FT-88213',
    commissioningYear: 2022, ownership: 'LOCATION', rentalCompany: 'Loxam Maroc', rentalEndIn: 18, energy: 'Diesel', capacityKg: 5000, weightKg: 7200,
    liftHeightM: 3.3, forkLengthMm: 1500, usage: 'Extérieur', notes: 'Fourches longues pour tuyauterie DN300.', hourMeter: 2210,
    serviceIntervalHours: 250, serviceIntervalMonths: 6, lastService: { at: -60, hours: 2050 }, lastInspectionAt: -168, habilitation: 'R489',
    records: [
      { type: 'PREVENTIVE', at: -60, days: 1, hours: 2050, description: 'Entretien 2 000 h réalisé par le loueur', provider: 'Loxam Maroc' },
      { type: 'CONTROLE_PERIODIQUE', at: -168, description: 'VGP — rapport fourni par le loueur', result: 'Conforme', provider: 'Apave Maroc' },
    ],
    checks: [{ at: 0, operator: 3, hours: 2210 }],
  },
  {
    code: 'ENG-D04', name: 'Gerbeur électrique 1,2 t', type: 'Gerbeur', brand: 'Jungheinrich', model: 'EJC 112', serialNumber: 'JH-EJC112-51027',
    commissioningYear: 2020, ownership: 'PROPRE', ownerService: 'Magasin Central MC01', energy: 'Électrique', capacityKg: 1200, liftHeightM: 3.6,
    forkLengthMm: 1150, batteryVoltage: 24, batteryCapacityAh: 250, usage: 'Intérieur', hourMeter: 1890, serviceIntervalHours: 500,
    serviceIntervalMonths: 12, lastService: { at: -200, hours: 1500 }, lastInspectionAt: -90, habilitation: 'R485', status: 'EN_PANNE',
    records: [
      { type: 'PREVENTIVE', at: -200, days: 1, hours: 1500, description: 'Révision annuelle', cost: 950, provider: 'Jungheinrich Maroc' },
      { type: 'CONTROLE_PERIODIQUE', at: -90, description: 'VGP — RAS', result: 'Conforme', cost: 600, provider: 'Bureau Veritas Maroc' },
      { type: 'PANNE', at: -3, hours: 1890, description: 'Fuite hydraulique au vérin de levée — gerbeur immobilisé en attente du kit joints' },
    ],
    checks: [{ at: -3, operator: 0, hours: 1890, failed: ['fuites', 'mat'], comment: 'Flaque d’huile sous le mât' }],
  },
  {
    code: 'ENG-D05', name: 'Transpalette électrique 2 t', type: 'Transpalette électrique', brand: 'BT', model: 'LWE200', serialNumber: 'BT-LWE200-20984',
    commissioningYear: 2019, ownership: 'PROPRE', ownerService: 'Magasin Central MC01', energy: 'Électrique', capacityKg: 2000, forkLengthMm: 1150,
    batteryVoltage: 24, batteryCapacityAh: 150, usage: 'Intérieur', hourMeter: 980, serviceIntervalMonths: 12, lastService: { at: -300 },
    inspectionIntervalMonths: 12, lastInspectionAt: -340, habilitation: 'R485',
    records: [
      { type: 'PREVENTIVE', at: -300, days: 1, description: 'Révision annuelle, remplacement galets', parts: 'Galets polyuréthane', cost: 620, provider: OCP },
      { type: 'CONTROLE_PERIODIQUE', at: -340, description: 'Contrôle annuel — RAS', result: 'Conforme', provider: 'Bureau Veritas Maroc' },
    ],
    checks: [],
  },
  {
    code: 'ENG-D06', name: 'Transpalette manuel 2,5 t', type: 'Transpalette manuel', brand: 'Pramac', model: 'GS25', serialNumber: 'PR-GS25-0412',
    commissioningYear: 2017, ownership: 'PROPRE', ownerService: 'Magasin Central MC01', energy: 'Manuel', capacityKg: 2500, forkLengthMm: 1150,
    usage: 'Intérieur', serviceIntervalMonths: 12, lastService: { at: -400 }, inspectionIntervalMonths: 12, lastInspectionAt: -120,
    records: [{ type: 'PREVENTIVE', at: -400, days: 1, description: 'Graissage, contrôle pompe hydraulique', provider: OCP }],
    checks: [],
  },
  {
    code: 'ENG-D07', name: 'Nacelle ciseaux 10 m électrique', type: 'Nacelle ciseaux', brand: 'Genie', model: 'GS-3246', serialNumber: 'GN-GS3246-118742',
    commissioningYear: 2023, ownership: 'LOCATION', rentalCompany: 'Loxam Maroc', rentalEndIn: 75, energy: 'Électrique', capacityKg: 318,
    workingHeightM: 11.7, maxPersons: 2, batteryVoltage: 24, batteryCapacityAh: 225, usage: 'Intérieur / Extérieur', dimensions: '2,44 × 1,17 × 2,26 m',
    hourMeter: 640, serviceIntervalHours: 150, serviceIntervalMonths: 6, lastService: { at: -30, hours: 600 }, lastInspectionAt: -25, habilitation: 'R486',
    records: [
      { type: 'PREVENTIVE', at: -30, days: 1, hours: 600, description: 'Entretien loueur : batteries, hydraulique, organes de sécurité', provider: 'Loxam Maroc' },
      { type: 'CONTROLE_PERIODIQUE', at: -25, description: 'VGP à la livraison', result: 'Conforme', provider: 'Apave Maroc' },
    ],
    checks: [{ at: -2, operator: 1, hours: 636, failed: ['gardecorps'], comment: 'Portillon ferme mal — signalé au loueur' }, { at: -5, operator: 1, hours: 628 }],
  },
  {
    code: 'ENG-D08', name: 'Nacelle articulée 16 m diesel', type: 'Nacelle articulée', brand: 'JLG', model: '450AJ', serialNumber: 'JLG-450AJ-300171',
    commissioningYear: 2016, ownership: 'PROPRE', ownerService: 'Maintenance OCP', energy: 'Diesel', capacityKg: 230, workingHeightM: 15.7, maxPersons: 2,
    usage: 'Extérieur', hourMeter: 3420, serviceIntervalHours: 250, serviceIntervalMonths: 6, lastService: { at: -150, hours: 3200 },
    lastInspectionAt: -200, habilitation: 'R486',
    records: [
      { type: 'PREVENTIVE', at: -150, days: 2, hours: 3200, description: 'Révision 3 200 h, contrôle des vérins de flèche', parts: 'Kit joints vérin', cost: 3900, provider: 'JLG Maroc' },
      { type: 'CONTROLE_PERIODIQUE', at: -200, description: 'VGP — réserve : usure patins de flèche à surveiller', result: 'Avec réserves', cost: 1100, provider: 'Bureau Veritas Maroc' },
    ],
    checks: [],
  },
  {
    code: 'ENG-D09', name: 'Pont roulant 10 t — Hangar', type: 'Pont roulant', brand: 'Demag', model: 'EKKE 10t', serialNumber: 'DM-EKKE-10-4471',
    commissioningYear: 2012, ownership: 'PROPRE', ownerService: 'Magasin Central MC01', energy: 'Électrique', capacityKg: 10000, liftHeightM: 8,
    usage: 'Intérieur', notes: 'Portée 13 m, télécommande radio.', serviceIntervalMonths: 12, lastService: { at: -180 }, lastInspectionAt: -10,
    habilitation: 'R484', status: 'HORS_SERVICE',
    records: [
      { type: 'PREVENTIVE', at: -180, days: 2, description: 'Graissage chemin de roulement, contrôle freins', cost: 2400, provider: OCP },
      { type: 'CONTROLE_PERIODIQUE', at: -10, description: 'Câble de levage : torons cassés, remplacement obligatoire avant remise en service', result: 'Non conforme', cost: 1500, provider: 'Bureau Veritas Maroc' },
    ],
    checks: [],
  },
  {
    code: 'ENG-D10', name: 'Chargeuse sur pneus', type: 'Chargeuse', brand: 'Caterpillar', model: '950M', serialNumber: 'CAT-950M-K5P01842',
    commissioningYear: 2020, ownership: 'LOCATION', rentalCompany: 'Sotradema', rentalEndIn: -5, energy: 'Diesel', capacityKg: 6000, weightKg: 18500,
    usage: 'Extérieur', hourMeter: 8540, serviceIntervalHours: 500, serviceIntervalMonths: 6, lastService: { at: -40, hours: 8300 }, lastInspectionAt: -60,
    records: [{ type: 'PREVENTIVE', at: -40, days: 1, hours: 8300, description: 'Entretien 8 250 h par le loueur', provider: 'Sotradema' }],
    checks: [{ at: -6, operator: 4, hours: 8530 }],
  },
];

/** Charge le parc de démonstration s'il n'est pas déjà présent ; renvoie le nombre d'engins créés */
export async function loadDemoEngins(prisma: PrismaClient): Promise<number> {
  if (await prisma.engin.count({ where: { isDemo: true } })) return 0;
  const today = dayToDate(siteToday());
  const d = (n: number) => addDays(today, n);
  const [types, storekeepers] = await Promise.all([
    prisma.habilitationType.findMany(),
    prisma.storekeeper.findMany({ orderBy: { matricule: 'asc' } }),
  ]);

  for (const e of DEMO) {
    const engin = await prisma.engin.create({
      data: {
        code: e.code,
        name: e.name,
        type: e.type,
        brand: e.brand,
        model: e.model,
        serialNumber: e.serialNumber,
        commissioningYear: e.commissioningYear,
        ownership: e.ownership,
        ownerService: e.ownerService,
        rentalCompany: e.rentalCompany,
        rentalEndDate: e.rentalEndIn !== undefined ? d(e.rentalEndIn) : null,
        energy: e.energy,
        capacityKg: e.capacityKg,
        weightKg: e.weightKg,
        liftHeightM: e.liftHeightM,
        workingHeightM: e.workingHeightM,
        forkLengthMm: e.forkLengthMm,
        batteryVoltage: e.batteryVoltage,
        batteryCapacityAh: e.batteryCapacityAh,
        maxPersons: e.maxPersons,
        usage: e.usage,
        dimensions: e.dimensions,
        notes: e.notes,
        hourMeter: e.hourMeter,
        hourMeterAt: e.hourMeter !== undefined ? today : null,
        serviceIntervalHours: e.serviceIntervalHours,
        serviceIntervalMonths: e.serviceIntervalMonths,
        lastServiceDate: e.lastService ? d(e.lastService.at) : null,
        lastServiceHours: e.lastService?.hours,
        inspectionIntervalMonths: e.inspectionIntervalMonths ?? 6,
        lastInspectionDate: e.lastInspectionAt !== undefined ? d(e.lastInspectionAt) : null,
        requiredHabilitationTypeId: e.habilitation ? types.find((t) => t.name.includes(e.habilitation as string))?.id : null,
        status: e.status ?? EnginStatus.DISPONIBLE,
        isDemo: true,
      },
    });
    await prisma.maintenanceRecord.createMany({
      data: e.records.map((r) => ({
        enginId: engin.id,
        type: r.type,
        date: d(r.at),
        endDate: r.type === 'CONTROLE_PERIODIQUE' ? d(r.at) : r.days !== undefined ? d(r.at + r.days) : null,
        hourMeter: r.hours,
        description: r.description,
        partsReplaced: r.parts,
        cost: r.cost,
        provider: r.provider,
        result: r.result,
      })),
    });
    const template = checklistFor(e.type);
    for (const c of e.checks) {
      const sk = storekeepers[c.operator % Math.max(storekeepers.length, 1)];
      const items = template.map((t) => ({ key: t.key, label: t.label, ok: !(c.failed ?? []).includes(t.key) }));
      await prisma.enginCheck.create({
        data: {
          enginId: engin.id,
          storekeeperId: sk?.id ?? null,
          operatorName: sk?.name ?? 'Conducteur',
          date: new Date(d(c.at).getTime() + 6.5 * 3_600_000),
          hourMeter: c.hours,
          items,
          allOk: items.every((i) => i.ok),
          comment: c.comment,
        },
      });
    }
  }
  return DEMO.length;
}
