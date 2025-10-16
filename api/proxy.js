// proxy-server.js - PROXY FUNCIONAL PARA VERCEL
// Salve como: api/proxy.js na raiz do projeto

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    const targetUrl = decodeURIComponent(url);

    console.log("🔗 Proxying:", targetUrl);

    // Headers para evitar bloqueios
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: "https://hianime.to",
      Referer: "https://hianime.to/",
    };

    // Se for range request, adicionar header Range
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      console.error("❌ Fetch failed:", response.status, response.statusText);
      return res.status(response.status).json({
        error: `Failed to fetch: ${response.statusText}`,
      });
    }

    // Copiar headers importantes
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    // Para M3U8, modificar URLs
    if (contentType && contentType.includes("mpegurl")) {
      const text = await response.text();

      // Corrigir URLs relativos no M3U8
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const modifiedM3U8 = text
        .split("\n")
        .map((line) => {
          if (line && !line.startsWith("#") && !line.startsWith("http")) {
            // URL relativo - proxiar também
            const fullUrl = baseUrl + line;
            return `${req.headers["x-forwarded-proto"] || "https"}://${
              req.headers.host
            }/api/proxy?url=${encodeURIComponent(fullUrl)}`;
          }
          return line;
        })
        .join("\n");

      console.log("✅ M3U8 modificado com sucesso");
      return res.status(200).send(modifiedM3U8);
    }

    // Para outros tipos, stream direto
    const buffer = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Proxy error:", error);
    return res.status(500).json({
      error: "Proxy failed",
      message: error.message,
    });
  }
}
