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
  password?: string;
  role: UserRole;
  avatarUrl: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password' | 'refreshToken'>;
  token: string;
  refreshToken: string;
}

export interface Comment {
  id: string;
  articleId: string;
  authorId?: string;
  authorName: string;
  authorEmail?: string;
  authorAvatarUrl: string;
  text: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithArticle extends Comment {
  article: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  showInHeader?: boolean;
  parentCategoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

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
  comments: Comment[];
  videoUrl?: string;
  isAdvertisement?: boolean;
  isFeatured?: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
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
  name?: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
