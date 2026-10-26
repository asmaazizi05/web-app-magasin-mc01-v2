import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  type LucideIcon,
  Map,
  Package,
  Settings,
  Truck,
  Users,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sous-sections (la rubrique s'ouvre au clic) */
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Tableau de bord & KPIs', icon: LayoutDashboard },
  { href: '/cartographie', label: 'Cartographie 2D (5 Zones)', icon: Map },
  {
    href: '/shifts',
    label: 'Personnel & Engins',
    icon: Users,
    children: [
      { href: '/shifts', label: 'Planning des postes', icon: CalendarDays },
      { href: '/shifts/magasiniers', label: 'Fiches magasiniers', icon: BadgeCheck },
      { href: '/shifts/prestations', label: 'Équipes support & prestations', icon: HardHat },
      { href: '/shifts/engins', label: 'Parc engins', icon: Truck },
    ],
  },
  { href: '/stock', label: 'Stock & Articles', icon: Package },
  { href: '/receptions', label: 'Réceptions & Entrées', icon: ArrowDownToLine },
  { href: '/expeditions', label: 'Sorties & Expéditions', icon: ArrowUpFromLine },
  { href: '/mouvements', label: 'Mouvements de stock (E/S)', icon: ArrowRightLeft },
  { href: '/inventaire-saisie', label: "Saisie d'inventaire", icon: ClipboardList },
  { href: '/inventaire', label: 'Inventaire & Audits', icon: ClipboardCheck },
  { href: '/parametres', label: 'Paramètres & Droits', icon: Settings },
];
