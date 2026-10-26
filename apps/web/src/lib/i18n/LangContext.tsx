'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { type Lang, registerClientLang } from './index';

const LangContext = createContext<Lang>('fr');
registerClientLang(() => useContext(LangContext));

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
