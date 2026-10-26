import { Article, Storekeeper } from '@prisma/client';

export interface ArticleRef {
  id: number;
  code: string;
  designation: string;
}

export interface StorekeeperRef {
  id: number;
  matricule: string;
  name: string;
}

export const toArticleRef = (a: Article): ArticleRef => ({ id: a.id, code: a.code, designation: a.designation });

export const toStorekeeperRef = (s: Storekeeper): StorekeeperRef => ({ id: s.id, matricule: s.matricule, name: s.name });
