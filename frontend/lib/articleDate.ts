import { Article } from '../types';

type ArticleWithDates = Pick<Article, 'publishedAt' | 'updatedAt' | 'createdAt'>;

export const getArticleDateString = (article: ArticleWithDates): string | null => {
  return article.publishedAt || article.updatedAt || article.createdAt || null;
};

export const formatArticleDate = (
  article: ArticleWithDates,
  options: Intl.DateTimeFormatOptions,
  locale: string = 'en-US'
): string => {
  const dateString = getArticleDateString(article);

  return dateString ? new Date(dateString).toLocaleDateString(locale, options) : '';
};
