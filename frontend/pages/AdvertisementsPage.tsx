import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types';
import { fetchArticles } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AdvertisementsPage: React.FC = () => {
  const [advertisements, setAdvertisements] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdvertisements = async () => {
      try {
        setLoading(true);
        setError(null);
        const ads = await fetchArticles({ isAdvertisement: true, status: 'ALL' });
        setAdvertisements(ads.filter(ad => ad.isAdvertisement));
      } catch (err) {
        console.error('Failed to load advertisements:', err);
        setError('Unable to load advertisements. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadAdvertisements();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading advertisements..." fullScreen />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-lg text-red-600 font-semibold mb-4">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!advertisements.length) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sponsored Content</h1>
        <p className="text-gray-600">No advertisements are available right now. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto px-4">
        <header className="max-w-3xl mx-auto text-center mb-10">
          <span className="inline-block uppercase tracking-wide text-xs font-semibold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full mb-3">
            Sponsored Content
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Discover Our Featured Advertisements</h1>
          <p className="text-gray-600">
            Explore the latest promotions and sponsored stories from our partners.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advertisements.map(ad => (
            <article key={ad.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <Link to={`/ads/${ad.slug}`} className="block h-full">
                <div className="relative">
                  {ad.coverImageUrl?.trim() ? (
                    <img
                      src={ad.coverImageUrl}
                      alt={ad.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm uppercase tracking-wide">
                      Advertisement
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                    Sponsored
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {ad.title}
                  </h2>
                  <p className="text-gray-600 text-sm line-clamp-3">{ad.summary}</p>
                  <span className="inline-block mt-2 text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    View Details
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default AdvertisementsPage;
