// api/proxy-stream.js - Função Serverless do Vercel

// Certifique-se de que o Vercel pode usar fetch (requer Node.js 18+)

export default async function (req, res) {
  // Extrai a URL real do vídeo do parâmetro 'url'
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).send('Parâmetro "url" faltando.');
  }

  // Adiciona o cabeçalho CORS para permitir que seu site acesse
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // Lida com requisições OPTIONS (pré-voo CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  console.log(`[PROXY] Buscando stream real: ${videoUrl}`);

  try {
    // Faz a requisição ao servidor de streaming (server-to-server)
    const streamResponse = await fetch(videoUrl, {
      method: "GET",
      // Simula headers de um navegador para evitar 403 (hotlink protection)
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        // O Referer pode ser crucial para burlar o hotlink protection
        Referer: "https://yayanimes.vercel.app/",
      },
    });

    if (!streamResponse.ok) {
      console.error(`[PROXY ERROR] Status: ${streamResponse.status}`);
      return res
        .status(502)
        .send(`Erro do servidor de streaming: ${streamResponse.status}`);
    }

    // Copia os cabeçalhos do stream (M3U8)
    const contentType =
      streamResponse.headers.get("Content-Type") ||
      "application/vnd.apple.mpegurl";
    res.setHeader("Content-Type", contentType);

    // Copia cabeçalhos importantes para streaming e cache
    const headersToForward = [
      "Content-Length",
      "Accept-Ranges",
      "Transfer-Encoding",
      "Cache-Control",
      "Etag",
    ];
    headersToForward.forEach((header) => {
      if (streamResponse.headers.has(header)) {
        res.setHeader(header, streamResponse.headers.get(header));
      }
    });

    // Envia o corpo da resposta como um stream
    const buffer = await streamResponse.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer)); // Use Buffer para Vercel
  } catch (error) {
    console.error("[PROXY FATAL ERROR]", error);
    res.status(500).send("Erro interno ao processar o stream.");
  }
}
