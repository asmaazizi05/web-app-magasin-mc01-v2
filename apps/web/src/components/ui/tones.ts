import type { Tone } from '@/lib/labels';

/** Classes de badge reprises de la maquette (fond clair / sombre + texte). */
export const BADGE_TONE: Record<Tone, string> = {
  green: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  red: 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300',
  purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300',
  gray: 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
  jesa: 'bg-jesa-light/15 text-jesa-light',
};

export const TEXT_TONE: Record<Tone, string> = {
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  purple: 'text-purple-600 dark:text-purple-400',
  gray: 'text-gray-700 dark:text-gray-300',
  jesa: 'text-jesa-light',
};

export const BAR_TONE: Record<Tone, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
  jesa: 'bg-jesa',
};

export const BORDER_TONE: Record<Tone, string> = {
  green: 'border-green-500/50',
  blue: 'border-blue-500/50',
  amber: 'border-amber-500/50',
  red: 'border-red-500/50',
  purple: 'border-purple-500/50',
  gray: 'border-gray-300 dark:border-gray-700',
  jesa: 'border-jesa/50',
};
