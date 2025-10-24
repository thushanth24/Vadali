export enum UserRole {
  PUBLIC = 'PUBLIC',
  AUTHOR = 'AUTHOR',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export enum ArticleStatus {
  DRAFT = 'Draft',
  PENDING_REVIEW = 'Pending Review',
  PUBLISHED = 'Published',
  REJECTED = 'Rejected',
}

export enum NotificationType {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMMENT = 'COMMENT',
  GENERAL = 'GENERAL',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  bio?: string;
  temporaryPassword?: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatarUrl: string;
  text: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  views: number;
  comments: Comment[];
  videoUrl?: string;
  isAdvertisement?: boolean;
  isFeatured?: boolean;
  rejectionReason?: string;
}

export interface Notification {
  id: string;
  userId: string;
  articleId?: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: string;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
}
