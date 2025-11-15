import { v4 as uuidv4 } from 'uuid';
import { ArticleStatus } from '../types';

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  imageUrls: string[];
  authorId: string;
  categoryId: string;
  tags: string[];
  status: ArticleStatus;
  publishedAt: string | null;
  views: number;
  videoUrl?: string;
  isAdvertisement?: boolean;
  isFeatured?: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const createArticle = (articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Article => {
  const now = new Date().toISOString();
  return {
    ...articleData,
    imageUrls: articleData.imageUrls ?? [],
    id: `a_${uuidv4()}`,
    views: 0,
    createdAt: now,
    updatedAt: now,
  };
};
