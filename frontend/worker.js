export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Intercept requests to /api/ and forward them to the EC2 backend
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = new URL(request.url);
      targetUrl.protocol = 'http:';
      targetUrl.hostname = '52.207.217.229';
      targetUrl.port = '8000';
      
      // We create a new request with the updated URL
      // This happens on Cloudflare's servers, so no Mixed Content error in the browser!
      const newRequest = new Request(targetUrl.toString(), new Request(request));
      return fetch(newRequest);
    }
    
    // For all other requests, serve the static assets (React app)
    let response = await env.ASSETS.fetch(request);
    
    // If the asset is not found (e.g. user refreshed on /dashboard), serve index.html for React Router
    if (response.status === 404) {
      const indexRequest = new Request(new URL('/', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }
    
    return response;
  }
};
