/**
 * Textes variables renvoyés par l'API (alertes, avertissements, messages d'erreur) : traduits par motif
 * quand ils n'ont pas de correspondance exacte dans le dictionnaire.
 */
const NOUN: Record<string, string> = {
  Article: 'Item',
  Audit: 'Audit',
  'Bon de réception': 'Goods receipt note',
  'Bon de sortie': 'Goods issue note',
  'Check-list': 'Checklist',
  'Compte rendu': 'Report',
  Engin: 'Equipment',
  Fiche: 'Sheet',
  Formation: 'Training',
  Habilitation: 'Certification',
  Intervenant: 'Worker',
  Intervention: 'Intervention',
  Magasinier: 'Storekeeper',
  Rack: 'Rack',
  Type: 'Type',
  Tâche: 'Task',
  Zone: 'Zone',
};
const ENGIN_STATUS: Record<string, string> = { Disponible: 'Available', 'En maintenance': 'In maintenance', 'En panne': 'Broken down', 'Hors service': 'Out of service' };

export const EN_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(.+?) (\S+) introuvable\.$/, (m) => `${NOUN[m[1]] ?? m[1]} ${m[2]} not found.`],
  [/^Le (code|matricule|rack) (\S+) existe déjà\.$/, (m) => `${{ code: 'Code', matricule: 'Employee ID', rack: 'Rack' }[m[1]]} ${m[2]} already exists.`],
  [/^Le bon (\S+) est clôturé et ne peut plus changer de statut\.$/, (m) => `Note ${m[1]} is closed and its status can no longer change.`],
  [/^Points non renseignés : (.+)\.$/, (m) => `Points not filled in: ${m[1]}.`],
  [/^Une photo est obligatoire pour chaque ligne \((\d+) photo\(s\) pour (\d+) ligne\(s\)\)\.$/, (m) => `A photo is required for each line (${m[1]} photo(s) for ${m[2]} line(s)).`],
  [/^Stock insuffisant pour (\S+) : (\S+) disponible\(s\), (\S+) demandé\(s\)\.$/, (m) => `Insufficient stock for ${m[1]}: ${m[2]} available, ${m[3]} requested.`],
  [/^Fin de location dans (\d+) j$/, (m) => `Rental ends in ${m[1]} d`],
  [/^En panne depuis le (.+)$/, (m) => `Broken down since ${m[1]}`],
  [/^(.+) déjà prévu sur « (.+) » \((.+)\) du (.+) au (.+)$/, (m) => `${m[1]} already booked on “${m[2]}” (${m[3]}) from ${m[4]} to ${m[5]}`],
  [/^(.+) : (Disponible|En maintenance|En panne|Hors service)$/, (m) => `${m[1]}: ${ENGIN_STATUS[m[2]]}`],
  [/^API injoignable \((.+)\)\. Vérifiez que le serveur NestJS est démarré\.$/, (m) => `API unreachable (${m[1]}). Check that the NestJS server is running.`],
];
