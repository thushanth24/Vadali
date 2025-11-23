export default async (request, context) => {
  const ua = request.headers.get('user-agent') || '';
  const isBot = /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|bot)/i.test(ua);
  if (!isBot) return context.next();

  const url = new URL(request.url);
  const slugMatch = url.pathname.match(/^\/article\/(.+)/);
  if (!slugMatch || !slugMatch[1]) return context.next();

  const slug = decodeURIComponent(slugMatch[1]).replace(/\/+$/, '');
  const apiUrl = `https://9zogdsw6a4.execute-api.us-east-1.amazonaws.com/share/article/${slug}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return context.next();

    const html = await response.text();
    return new Response(html, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
      },
    });
  } catch (error) {
    console.error('Edge prerender failed', error);
    return context.next();
  }
};
