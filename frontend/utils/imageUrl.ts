const CDN_DOMAIN = 'https://cdn.vadalimedia.lk';

export const getImageUrl = (path?: string | null): string => {
  if (!path) return '/placeholder.png'; // Fallback for missing images

  // Already a CloudFront URL
  if (path.includes('cdn.vadalimedia.lk')) {
    return path;
  }

  // Rewrite old S3 URLs to CloudFront
  if (path.includes('vadaliarticles.s3')) {
    const cleanPath = path.split('.com/')[1];
    return `${CDN_DOMAIN}/${cleanPath}`;
  }

  // Handle bare keys/relative paths
  if (!path.startsWith('http')) {
    return `${CDN_DOMAIN}/${path}`;
  }

  // External URLs are returned as-is
  return path;
};
