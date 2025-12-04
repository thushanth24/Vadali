import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { API_BASE, fetchArticleBySlug, fetchArticles, fetchUser, fetchCategories, postComment } from '../services/api';
import { Article, User, Category, Comment } from '../types';
import { ArticleStatus } from '../types';
import { Calendar, User as UserIcon, MessageSquare, Tag, Facebook, Twitter, Linkedin } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatArticleDate } from '../lib/articleDate';
import { getImageUrl } from '../utils/imageUrl';

const extractGalleryFromContent = (html: string) => {
  if (!html) {
    return { urls: [] as string[], sanitizedHtml: '' };
  }

  if (typeof DOMParser === 'undefined') {
    return { urls: [] as string[], sanitizedHtml: html };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const inlineGalleries = Array.from(doc.querySelectorAll('[data-inline-gallery]'));
    const urls: string[] = [];

    inlineGalleries.forEach((node) => {
      const urlNodes = Array.from(node.querySelectorAll('[data-gallery-url]'));
      urlNodes.forEach((urlNode) => {
        const url = urlNode.getAttribute('data-gallery-url')?.trim();
        if (url) {
          urls.push(url);
        }
      });
      node.remove();
    });

    return { urls, sanitizedHtml: doc.body.innerHTML };
  } catch (error) {
    console.error('Failed to parse inline gallery metadata', error);
    return { urls: [] as string[], sanitizedHtml: html };
  }
};

const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [author, setAuthor] = useState<User | undefined>(undefined);
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const BASE_TITLE = 'Vadali Media';
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');

  const loadArticleData = async () => {
    if (!slug) {
      setArticle(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const articleData = await fetchArticleBySlug(slug);
      
      if (!articleData || articleData.status !== ArticleStatus.PUBLISHED) {
          setArticle(null);
          return;
      }

      setArticle(articleData);

      // Fetch related data in parallel
      const [authorData, allCategories, relatedData] = await Promise.all([
        fetchUser(articleData.authorId),
        fetchCategories(),
        fetchArticles({ categoryId: articleData.categoryId, limit: 4 })
      ]);
      
      setAuthor(authorData);
      setCategory(allCategories.find(c => c.id === articleData.categoryId));
      setRelatedArticles(relatedData.filter(a => a.id !== articleData.id).slice(0, 3));

    } catch (error) {
      console.error("Failed to load article:", error);
      setArticle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticleData();
  }, [slug]);

  const articleContent = article?.content ?? '';
  const articleImageUrls = Array.isArray(article?.imageUrls) ? article.imageUrls : [];

  const { urls: metadataGalleryUrls, sanitizedHtml: contentWithoutMetadata } = useMemo(
    () => extractGalleryFromContent(articleContent),
    [articleContent]
  );

  const galleryImages = useMemo(() => {
    const combined = [...articleImageUrls, ...metadataGalleryUrls];
    const normalized = combined
      .map((url) => (typeof url === 'string' ? url.trim() : ''))
      .filter((url): url is string => Boolean(url));

    return Array.from(new Set(normalized));
  }, [articleImageUrls, metadataGalleryUrls]);
  
  useEffect(() => {
    if (article) {
      console.log('[ArticlePage] Gallery debug', {
        apiImageUrls: articleImageUrls,
        inlineMetadataUrls: metadataGalleryUrls,
        combinedGallery: galleryImages,
        slug: article.slug,
      });
    } else {
      console.log('[ArticlePage] No article yet, gallery data pending');
    }
  }, [article, articleImageUrls, metadataGalleryUrls, galleryImages]);

  const shareImage = getImageUrl(article?.coverImageUrl || galleryImages[0] || '');

  const resolvedLocation = typeof window !== 'undefined' ? window.location.href : '';
  const canonicalUrl = article ? `https://vadalimedia.lk/article/${article.slug}` : resolvedLocation || 'https://vadalimedia.lk/';
  const metaDescription = article?.summary || article?.title || 'Latest stories from Vadali Media.';
  const helmetTitle = article ? `${article.title} | ${BASE_TITLE}` : BASE_TITLE;
  const twitterCard = shareImage ? 'summary_large_image' : 'summary';
  const showSkeleton = loading && !article;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cleanupFns: Array<() => void> = [];
    const previousTitle = document.title;

    if (helmetTitle) {
      document.title = helmetTitle;
    }

    const setMeta = (attrName: 'name' | 'property', attrValue: string, content?: string | null) => {
      if (!content) return;
      const selector = `meta[${attrName}="${attrValue}"]`;
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      const created = !el;
      const prevContent = el?.getAttribute('content') ?? null;

      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }

      el.setAttribute('content', content);

      cleanupFns.push(() => {
        if (!el) return;
        if (created) {
          document.head.removeChild(el);
        } else if (prevContent !== null) {
          el.setAttribute('content', prevContent);
        } else {
          el.removeAttribute('content');
        }
      });
    };

    const setLink = (rel: string, href?: string | null) => {
      if (!href) return;
      const selector = `link[rel="${rel}"]`;
      let el = document.head.querySelector(selector) as HTMLLinkElement | null;
      const created = !el;
      const prevHref = el?.getAttribute('href') ?? null;

      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }

      el.setAttribute('href', href);

      cleanupFns.push(() => {
        if (!el) return;
        if (created) {
          document.head.removeChild(el);
        } else if (prevHref !== null) {
          el.setAttribute('href', prevHref);
        } else {
          el.removeAttribute('href');
        }
      });
    };

    setMeta('name', 'description', metaDescription);
    setMeta('property', 'og:type', 'article');
    setMeta('property', 'og:title', article?.title || BASE_TITLE);
    setMeta('property', 'og:description', metaDescription);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:site_name', 'Vadali Media');
    if (shareImage) {
      setMeta('property', 'og:image', shareImage);
      setMeta('property', 'og:image:secure_url', shareImage);
    }

    setMeta('name', 'twitter:card', twitterCard);
    setMeta('name', 'twitter:title', article?.title || BASE_TITLE);
    setMeta('name', 'twitter:description', metaDescription);
    if (shareImage) {
      setMeta('name', 'twitter:image', shareImage);
    }

    setLink('canonical', canonicalUrl);

    return () => {
      document.title = previousTitle;
      cleanupFns.forEach(fn => fn());
    };
  }, [helmetTitle, metaDescription, canonicalUrl, shareImage, twitterCard, article?.title, BASE_TITLE]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !article) return;
    
    setIsSubmittingComment(true);
    setCommentMessage('');
    try {
      await postComment(article.id, commentText);
      setCommentText('');
      setCommentMessage('Your comment has been submitted for moderation. Thank you!');
    } catch {
      setCommentMessage('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (showSkeleton) {
    return (
      <div className="bg-gray-100 py-8 overflow-x-hidden">
          <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <article className="lg:col-span-8 bg-white p-8 shadow-sm space-y-6 animate-pulse">
              <div className="inline-block h-6 w-24 bg-gray-200 rounded-full" />
              <div className="h-8 bg-gray-200 rounded w-5/6" />
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div className="h-64 bg-gray-200 rounded-lg" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="h-32 bg-gray-200 rounded-md" />
                <div className="h-32 bg-gray-200 rounded-md" />
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-6 w-16 bg-gray-200 rounded-full" />
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t">
                <div className="h-5 w-40 bg-gray-200 rounded" />
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-10 w-28 bg-gray-200 rounded-md" />
                  ))}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t">
                <div className="h-6 w-48 bg-gray-200 rounded" />
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="flex space-x-3">
                    <div className="h-12 w-12 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-gray-200 rounded" />
                      <div className="h-3 w-3/4 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
                <div className="h-24 bg-gray-100 rounded-md border border-dashed border-gray-200" />
              </div>
            </article>

            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 shadow-sm text-center space-y-3 animate-pulse">
                <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto" />
                <div className="h-5 w-1/2 bg-gray-200 rounded mx-auto" />
                <div className="h-4 w-1/3 bg-gray-200 rounded mx-auto" />
              </div>
              <div className="bg-white p-6 shadow-sm space-y-4 animate-pulse">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="h-16 w-24 bg-gray-200 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-5/6 bg-gray-200 rounded" />
                      <div className="h-3 w-2/3 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return loading ? null : <Navigate to="/" replace />;
  }

  const approvedComments = article.comments.filter(c => c.status === 'APPROVED');
  const sharePreviewUrl = `https://vadalimedia.lk/share/article/${article.slug}`;
  const encodedUrl = encodeURIComponent(sharePreviewUrl);
  const encodedTitle = encodeURIComponent(article.title);
  const encodedSummary = encodeURIComponent(article.summary);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedSummary}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`
  };

  const publishedDateLabel = formatArticleDate(article, { dateStyle: 'long' });

  return (
    <div className="bg-gray-100 py-8 overflow-x-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <article className="lg:col-span-8 bg-white p-8 shadow-sm">
            {category && (
              <Link to={`/category/${category.slug}`} className="text-sm font-bold text-white bg-[#1a237e] px-3 py-1 rounded-sm uppercase hover:bg-blue-900">
                {category.name}
              </Link>
            )}
            <h1 className="text-xl md:text-2xl font-bold my-4 text-gray-800 leading-tight break-words">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 border-t border-b py-3 mb-6">
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                {author ? (
                  <Link to={`/author/${author.id}`} className="hover:text-blue-600 hover:underline">
                    {author.name}
                  </Link>
                ) : 'Loading author...'}
              </div>
            {publishedDateLabel && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{publishedDateLabel}</span>
              </div>
            )}
              <div className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" /> {approvedComments.length} Comments
              </div>
            </div>
            
             <p className="text-lg text-gray-600 mb-8 break-words">{article.summary}</p>

            <img src={getImageUrl(article.coverImageUrl)} alt={article.title} className="w-full mb-8 rounded-md" />

            <style>{`.article-content [data-inline-gallery]{display:none !important;}`}</style>
            <div className="prose lg:prose-lg article-content" dangerouslySetInnerHTML={{ __html: contentWithoutMetadata }} />

            {galleryImages.length > 0 && (
              <div className="my-8">
                <h3 className="text-2xl font-bold mb-4 border-b-2 border-[#d32f2f] pb-2">Gallery</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {galleryImages.map((imageUrl, index) => (
                    <figure key={`${imageUrl}-${index}`} className="overflow-hidden rounded-md bg-gray-50">
                      <img
                        src={getImageUrl(imageUrl)}
                        alt={`${article.title} image ${index + 1}`}
                        className="w-full h-64 object-cover hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </figure>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-8 border-t pt-6 flex flex-wrap gap-2">
                {article.tags.map(tag => (
                    <Link 
                      key={tag} 
                      to={`/tag/${encodeURIComponent(tag)}`}
                      className="bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                       <Tag size={12} className="mr-1.5" /> {tag}
                    </Link>
                ))}
            </div>

            {/* Social Share Section */}
            <div className="mt-8 border-t pt-6">
                <h4 className="font-bold text-lg mb-4 text-gray-800">Share this article:</h4>
                <div className="flex flex-wrap gap-3">
                    <a
                      href={shareLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-[#1855bf] bg-white border border-[#1877F2] shadow-sm hover:bg-[#1877F2]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1877F2] transition-colors"
                    >
                        <Facebook size={18} />
                        <span>Facebook</span>
                    </a>
                    <a
                      href={shareLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-[#0f8cd4] bg-white border border-[#1DA1F2] shadow-sm hover:bg-[#1DA1F2]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1DA1F2] transition-colors"
                    >
                        <Twitter size={18} />
                        <span>Twitter</span>
                    </a>
                    <a
                      href={shareLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-[#0a57a5] bg-white border border-[#0A66C2] shadow-sm hover:bg-[#0A66C2]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A66C2] transition-colors"
                    >
                        <Linkedin size={18} />
                        <span>LinkedIn</span>
                    </a>
                    <a
                      href={shareLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-[#1ca851] bg-white border border-[#25D366] shadow-sm hover:bg-[#25D366]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                        <span>WhatsApp</span>
                    </a>
                </div>
            </div>


            {article.videoUrl && (
              <div className="my-8">
                <h3 className="text-2xl font-bold mb-4 border-b-2 border-[#d32f2f] pb-2">Related Video</h3>
                <div className="aspect-w-16 aspect-h-9">
                  <iframe 
                    src={article.videoUrl} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>
            )}
            
            {/* Comments Section */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-[#d32f2f] pb-2">{approvedComments.length} Comments</h3>
              <div className="space-y-6">
                {approvedComments.map(comment => (
                  <div key={comment.id} className="flex items-start space-x-4">
                    <img src={getImageUrl(comment.authorAvatarUrl)} alt={comment.authorName} className="h-12 w-12 rounded-full" />
                    <div>
                      <p className="font-semibold text-gray-800">{comment.authorName}</p>
                      <p className="text-xs text-gray-500 mb-1">{new Date(comment.date).toLocaleString()}</p>
                      <p className="text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCommentSubmit} className="mt-8 bg-gray-50 p-4 rounded-md">
                <h4 className="font-bold text-lg mb-3">Post a Comment</h4>
                <textarea 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={isSubmittingComment}
                  className="w-full border rounded-md p-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Write your comment..."
                  required
                ></textarea>
                 {commentMessage && <p className="text-sm text-green-600 mt-2">{commentMessage}</p>}
                <Button type="submit" className="mt-2" disabled={isSubmittingComment}>
                  {isSubmittingComment ? 'Submitting...' : 'Post Comment'}
                </Button>
              </form>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {author && (
              <div className="bg-white p-6 shadow-sm text-center">
                <Link to={`/author/${author.id}`}>
                  <img src={getImageUrl(author.avatarUrl)} alt={author.name} className="h-24 w-24 rounded-full mx-auto mb-4" />
                  <h4 className="font-bold text-xl hover:text-blue-600 transition-colors">{author.name}</h4>
                </Link>
                <p className="text-gray-600">{author.role}</p>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold mb-4 border-b-2 border-[#d32f2f] pb-2">Related Articles</h3>
              <div className="space-y-4">
                {relatedArticles.map(rel => (
                  <Link key={rel.id} to={`/article/${rel.slug}`} className="flex items-start space-x-3 group">
                    <img src={getImageUrl(rel.coverImageUrl)} alt={rel.title} className="w-24 h-16 object-cover"/>
                    <h5 className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition-colors leading-tight">{rel.title}</h5>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;



