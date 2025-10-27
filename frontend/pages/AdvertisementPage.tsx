import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Article } from '../types';
import { fetchArticleBySlug } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatArticleDate } from '../lib/articleDate';

const AdvertisementPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [advertisement, setAdvertisement] = useState<Article | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdvertisement = async () => {
      if (!slug) {
        setAdvertisement(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchArticleBySlug(slug);
        if (!result || !result.isAdvertisement) {
          setAdvertisement(null);
          return;
        }
        setAdvertisement(result);
      } catch (error) {
        console.error('Failed to load advertisement:', error);
        setAdvertisement(null);
      } finally {
        setLoading(false);
      }
    };

    loadAdvertisement();
  }, [slug]);

  if (loading) {
    return <LoadingSpinner label="Loading advertisement..." className="container mx-auto px-4 py-16" />;
  }

  if (!advertisement) {
    return <Navigate to="/" replace />;
  }

  const publishedDate = formatArticleDate(advertisement, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasContent = Boolean(advertisement.content?.trim());

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide">Sponsored Advertisement</span>
            {publishedDate && (
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                {publishedDate}
              </span>
            )}
          </div>

          {advertisement.coverImageUrl?.trim() ? (
            <img
              src={advertisement.coverImageUrl}
              alt={advertisement.title}
              className="w-full h-72 object-cover"
            />
          ) : (
            <div className="w-full h-72 bg-gray-200 flex items-center justify-center text-gray-500 text-sm uppercase tracking-wide">
              Advertisement
            </div>
          )}

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900">{advertisement.title}</h1>
              <p className="text-lg text-gray-700">{advertisement.summary}</p>
            </div>

            {hasContent && (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: advertisement.content }} />
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Presented By</p>
              <p className="text-lg text-indigo-900 font-medium mt-1">
                {advertisement.authorId ? 'Our Advertising Partner' : 'Sponsored'}
              </p>
            </div>

            <div className="text-xs text-gray-500 text-center">
              You are viewing a sponsored advertisement. Content is provided by the advertiser.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertisementPage;
