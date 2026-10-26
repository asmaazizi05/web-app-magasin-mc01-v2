'use client';

import { ClipboardList, History, ShieldCheck, Tags } from 'lucide-react';
import { useState } from 'react';
import { fmtDay, fmtInt } from '@/lib/format';
import { COUNT_LINE_STATUS } from '@/lib/labels';
import type { DesignationRequest, InventoryCount, InventoryOptions, PendingValidation, SheetOptions, ShiftType, Storekeeper, Zone } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { SHIFT } from '@/lib/labels';
import { useProfile } from '../layout/ProfileContext';
import { StatusBadge } from '../ui/StatusBadge';
import { CountForm } from './CountForm';
import { RequestsPanel, ValidationPanel } from './ResponsablePanels';
import { useT } from '@/lib/i18n';

type Tab = 'saisie' | 'historique' | 'demandes' | 'validation';

interface InventoryTabsProps {
  storekeepers: Storekeeper[];
  options: InventoryOptions;
  sheetOptions: SheetOptions;
  currentPosts: Record<number, ShiftType>;
  counts: InventoryCount[];
  requests: DesignationRequest[];
  pending: PendingValidation[];
  zones: Zone[];
  nextCode: string;
}

export function InventoryTabs({ storekeepers, options, sheetOptions, currentPosts, counts, requests, pending, zones, nextCode }: InventoryTabsProps) {
  const tr = useT();
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>('saisie');
  // Rattachement, création de références et régularisation : réservés aux responsables (EL ATYQY, AZIZI)
  const responsable = profile.admin;
  const tabs: { key: Tab; label: string; icon: typeof ClipboardList; badge?: number; show: boolean }[] = [
    { key: 'saisie', label: tr('Saisir un comptage'), icon: ClipboardList, show: true },
    { key: 'historique', label: tr('Historique des comptages'), icon: History, show: true },
    { key: 'demandes', label: tr('Demandes de désignation'), icon: Tags, badge: requests.length, show: responsable },
    { key: 'validation', label: tr('Validation & régularisation'), icon: ShieldCheck, badge: pending.length, show: responsable },
  ];
  const current = tabs.find((t) => t.key === tab && t.show) ? tab : 'saisie';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-300 bg-gray-100 p-1 text-xs dark:border-gray-700 dark:bg-navy-dark">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                current === t.key ? 'bg-jesa font-bold text-white shadow' : 'font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {tr(t.label)}
              {t.badge ? <span className={`rounded-full px-1.5 text-[10px] font-bold ${current === t.key ? 'bg-white/25' : 'bg-amber-500 text-white'}`}>{t.badge}</span> : null}
            </button>
          ))}
      </div>

      {current === 'saisie' && (
        <div className="mx-auto max-w-4xl">
          <CountForm storekeepers={storekeepers} options={options} sheetOptions={sheetOptions} currentPosts={currentPosts} />
        </div>
      )}

      {current === 'historique' && (
        <div className="space-y-3">
          {counts.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{tr('Aucun comptage enregistré.')}</p>}
          {counts.map((c) => (
            <div key={c.id} className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-navy-light">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p>
                  <span className="font-mono font-bold text-jesa-light">{c.number}</span>{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{c.storekeeper.name}</span>
                  {c.post ? ` · ${tr(SHIFT[c.post].rotationLabel)}` : ''} · {fmtDay(c.countedAt)}
                  {c.location ? ` · ${c.location}` : ''}
                </p>
                <span className="text-[11px] text-gray-500">{c.lines.length} {tr('ligne(s)')}</span>
              </div>
              <ul className="divide-y divide-gray-100 text-[11px] dark:divide-gray-800">
                {c.lines.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      {l.photoUrl && (
                        <a href={apiUrl(l.photoUrl)} target="_blank" rel="noreferrer" className="flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={apiUrl(l.photoUrl)} alt="" className="h-9 w-9 rounded-md border border-gray-200 object-cover dark:border-gray-700" />
                        </a>
                      )}
                      <span>
                      {l.article ? (
                        <>
                          <span className="font-mono font-bold text-jesa-light">{l.article.code}</span> {l.article.designation}
                        </>
                      ) : (
                        <span className="italic">
                          {[l.enteredReference, l.enteredDesignation].filter(Boolean).join(' — ')} <span className="not-italic text-amber-600">{tr('(saisie libre)')}</span>
                        </span>
                      )}{' '}
                      · <strong>{fmtInt(l.quantity)} {l.unit}</strong>
                      {l.category && <span className="text-gray-500"> · {tr(l.category)}</span>}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {l.movementNumber && <span className="font-mono text-[10px] text-gray-500">{l.movementNumber}</span>}
                      {l.status === 'VALIDEE' && l.stockBefore !== null && (
                        <span className="text-[10px] text-gray-500">
                          {tr('stock')} {fmtInt(l.stockBefore)} → {fmtInt(l.stockAfter ?? 0)}
                        </span>
                      )}
                      {l.rejectReason && <span className="text-[10px] text-gray-500">{l.rejectReason}</span>}
                      <StatusBadge tone={COUNT_LINE_STATUS[l.status].tone} label={tr(COUNT_LINE_STATUS[l.status].label)} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {current === 'demandes' && <RequestsPanel requests={requests} options={options} zones={zones} nextCode={nextCode} />}
      {current === 'validation' && <ValidationPanel pending={pending} options={options} />}
    </div>
  );
}
