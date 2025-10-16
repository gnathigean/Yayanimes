// ☁️ CLOUDFLARE WORKER - PROXY M3U8
// Deploy em: https://workers.cloudflare.com

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range",
  };

  // Handle OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Validar URL
  if (!targetUrl) {
    return new Response("URL parameter required", {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    console.log("Proxying:", decodedUrl);

    // Headers para evitar bloqueio
    const headers = new Headers();
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    headers.set("Accept", "*/*");
    headers.set("Accept-Language", "en-US,en;q=0.9");
    headers.set("Origin", "https://hianime.to");
    headers.set("Referer", "https://hianime.to/");

    // Passar Range header se existir
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      headers.set("Range", rangeHeader);
    }

    // Fazer request
    const response = await fetch(decodedUrl, {
      method: "GET",
      headers: headers,
    });

    // Copiar response
    const responseHeaders = new Headers(response.headers);

    // Adicionar CORS headers
    Object.keys(corsHeaders).forEach((key) => {
      responseHeaders.set(key, corsHeaders[key]);
    });

    // Se for M3U8, modificar URLs
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("mpegurl")) {
      const text = await response.text();

      // Extrair base URL
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);

      // Modificar URLs relativos
      const modifiedM3U8 = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();

          // Se for URL e não for absoluto
          if (
            trimmed &&
            !trimmed.startsWith("#") &&
            !trimmed.startsWith("http")
          ) {
            const fullUrl = baseUrl + trimmed;
            // Retornar proxiado
            return `${url.origin}${url.pathname}?url=${encodeURIComponent(
              fullUrl
            )}`;
          }

          return line;
        })
        .join("\n");

      return new Response(modifiedM3U8, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // Para outros tipos (TS segments, etc)
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);

    return new Response(
      JSON.stringify({
        error: "Proxy failed",
        message: error.message,
        url: targetUrl,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

// ==========================================
// INSTRUÇÕES DE DEPLOY:
// ==========================================
// 1. Vá em: https://workers.cloudflare.com
// 2. Crie uma conta gratuita
// 3. Clique em "Create a Worker"
// 4. Cole este código
// 5. Clique em "Save and Deploy"
// 6. Copie a URL do worker (ex: https://seu-worker.workers.dev)
// 7. Use no seu projeto:
//    this.proxyURL = 'https://seu-worker.workers.dev?url='
