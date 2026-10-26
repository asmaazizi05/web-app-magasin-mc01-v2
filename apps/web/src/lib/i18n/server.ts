import { cookies } from 'next/headers';
import { LANG_COOKIE, type Lang, makeT, parseLang, setServerLang, type Translate } from './index';

/** Lit la langue de la requête et la rend disponible aux composants serveur (`useT`) : à appeler en tête de page */
export async function getLang(): Promise<Lang> {
  const lang = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  setServerLang(lang);
  return lang;
}

export async function getT(): Promise<Translate> {
  return makeT(await getLang());
}
