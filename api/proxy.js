// api/proxy.js - Proxy para resolver CORS

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Responder OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Pegar o endpoint da query string
  const endpoint = req.query.endpoint;

  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint não fornecido" });
  }

  const apiUrl = `https://novaapi-seven.vercel.app${endpoint}`;

  console.log(`🔄 Proxy: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Erro no proxy:", error);
    res.status(500).json({
      error: "Erro ao buscar dados",
      message: error.message,
    });
  }
}
