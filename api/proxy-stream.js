// api/proxy-stream.js

import fetch from "node-fetch";

export default async function (req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Falta o parâmetro "url"');
  }

  try {
    // 1. Faz a requisição ao servidor de vídeo (stormshade84.live)
    const streamResponse = await fetch(url, {
      // Adicionar headers para simular um navegador legítimo pode ajudar com o 403
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://yayanimes.vercel.app/", // Opcional, mas útil para hotlink protection
      },
    });

    if (!streamResponse.ok) {
      // Retorna o status de erro do servidor de vídeo (por exemplo, 403)
      return res
        .status(streamResponse.status)
        .send(`Erro ao buscar stream: ${streamResponse.statusText}`);
    }

    // 2. Copia os cabeçalhos relevantes e adiciona o CORS
    res.setHeader("Access-Control-Allow-Origin", "*"); // Permite CORS no seu próprio domínio
    res.setHeader(
      "Content-Type",
      streamResponse.headers.get("Content-Type") ||
        "application/vnd.apple.mpegurl"
    );
    res.setHeader("Cache-Control", "public, max-age=600");

    // Opcional: Copia cabeçalhos de streaming como Content-Length, etc.
    const headersToForward = [
      "Content-Length",
      "Accept-Ranges",
      "Transfer-Encoding",
    ];
    headersToForward.forEach((header) => {
      if (streamResponse.headers.has(header)) {
        res.setHeader(header, streamResponse.headers.get(header));
      }
    });

    // 3. Envia o corpo do stream de volta ao cliente
    streamResponse.body.pipe(res);
  } catch (error) {
    console.error("Erro no proxy:", error);
    res.status(500).send("Erro interno do proxy");
  }
}
