// /api/anime.js
// Proxy para Aniwatch API com CORS habilitado

const ANIWATCH_BASE = "https://aniwatch-api-dusky.vercel.app/api/v2/hianime";

// Cache simples (5 minutos)
const cache = new Map();

function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    expiry: Date.now() + 5 * 60 * 1000, // 5 minutos
  });
}

export default async (req, res) => {
  // Habilitar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  // Responder a preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Pegar o path da requisição (ex: /api/anime/home -> home)
    const path = req.url.replace("/api/anime", "").split("?")[0] || "/home";

    // Construir query string se existir
    const queryString = req.url.includes("?")
      ? "?" + req.url.split("?")[1]
      : "";

    // Verificar cache
    const cacheKey = `${path}${queryString}`;
    const cached = getCache(cacheKey);

    if (cached) {
      console.log(`✅ Cache hit: ${path}`);
      res.status(200).json(cached);
      return;
    }

    // URL completa para a Aniwatch API
    const url = `${ANIWATCH_BASE}${path}${queryString}`;

    console.log(`🌐 Proxy request: ${url}`);

    // Fazer requisição para Aniwatch
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Aniwatch API error: ${response.status}`);
    }

    const data = await response.json();

    // Salvar no cache
    setCache(cacheKey, data);

    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);

    res.status(500).json({
      success: false,
      message: "Erro ao buscar dados da API",
      error: error.message,
    });
  }
};
