/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch( request, env, ctx ) {
    let cache = caches.default;

    const cacheKey = new Request(request.url, request);

    let response = await cache.match(cacheKey);

    if ( !response ) {
      response = await handleRequest(request, env);
    }

    const newResponse = new Response(response.body, response);

    newResponse.headers.append( "x-workers-hello", "WP63" );
    newResponse.headers.append( "Cache-Control", "86400" );

    return newResponse;
  },
};

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request, env) {
  // Parse request URL to get access to query string
  let imageURL = '';
  let options = {};

  if ( request.url === '/favicon.ico' ) {
    return request;
  } else {
    let url = new URL(request.url);
    let pathFragments = url.pathname.split('/');
    let filename = String( pathFragments.slice(-1) );

    if (!/\.(jpg|jpeg|png|gif|webp|ico)$/i.test(url.pathname)) {
      const passthroughUrl = `${env.IMG_HOST}${request.url}`;

      return fetch(passthroughUrl, {
        cacheTtl: 86400,
        cacheEverything: true,
      });
    }

    let regex = /(-([0-9]*)x([0-9]*)).[A-z]*$/g;
    let dimension = regex.exec(filename);
    let realFilename = '';

    if ( dimension !== null ) {
      realFilename = dimension[1];

      pathFragments[pathFragments.length - 1] = filename.replace(dimension[1], '');
    }

    url.hostname = env.IMG_HOST;
    url.pathname = pathFragments.join('/');

    // Cloudflare-specific options are in the cf object.
    options = {
      cf: {
        image: {}
      },
      cacheTtl: 86400,
      cacheEverything: true,
    };

    options.cf.image.quality = 85;

    if ( dimension ) {
      options.cf.image.width = dimension[2];
      options.cf.image.height = dimension[3];
    }

    const accept = request.headers.get("Accept");

    if (/image\/avif/.test(accept)) {
      options.cf.image.format = 'avif';
    } else if (/image\/webp/.test(accept)) {
      options.cf.image.format = 'webp';
    }

    imageURL = url.toString();
  }

  const imageRequest = new Request(imageURL, {
    headers: request.headers
  })

  return fetch(imageRequest, options);
}
