// api/create-payment.js
// Endpoint para criar pagamentos PIX com PagSeguro/PagBank

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;
const PAGSEGURO_EMAIL = process.env.PAGSEGURO_EMAIL;

// URLs da API PagSeguro
const PAGSEGURO_API_URL =
  process.env.PAGSEGURO_SANDBOX === "true"
    ? "https://sandbox.api.pagseguro.com"
    : "https://api.pagseguro.com";

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🚀 Iniciando criação de pagamento PagSeguro...");
  console.log("📝 Body recebido:", req.body);

  try {
    const { user_id, plan_type, amount, email } = req.body;

    // Validar dados
    if (!user_id || !plan_type || !amount || !email) {
      console.error("❌ Dados incompletos");
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // Validar variáveis de ambiente
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !PAGSEGURO_TOKEN) {
      console.error("❌ Variáveis de ambiente não configuradas");
      return res
        .status(500)
        .json({ error: "Configuração do servidor incompleta" });
    }

    console.log("✅ Variáveis de ambiente OK");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar/criar usuário
    console.log("🔍 Verificando usuário:", user_id);

    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError) {
      console.log("📝 Criando perfil de usuário...");
      const { error: createError } = await supabase
        .from("user_profiles")
        .insert([{ id: user_id, email: email }]);

      if (createError) {
        console.error("❌ Erro ao criar perfil:", createError);
        return res
          .status(500)
          .json({ error: "Erro ao criar perfil de usuário" });
      }
      console.log("✅ Perfil criado");
    }

    // Verificar assinatura ativa
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

    if (existingSub) {
      return res
        .status(400)
        .json({ error: "Usuário já possui assinatura ativa" });
    }

    // Construir webhook URL
    const webhookUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhook-pagseguro`
      : `https://${req.headers.host}/api/webhook-pagseguro`;

    console.log("🔔 Webhook URL:", webhookUrl);

    // Criar cobrança PIX no PagSeguro
    console.log("💳 Criando cobrança PIX no PagSeguro...");

    const orderData = {
      reference_id: `${user_id}-${Date.now()}`,
      customer: {
        name: email.split("@")[0],
        email: email,
        tax_id: "00000000000", // CPF fake para teste
      },
      items: [
        {
          reference_id: plan_type,
          name: `Assinatura ${plan_type}`,
          quantity: 1,
          unit_amount: Math.round(amount * 100), // Centavos
        },
      ],
      qr_codes: [
        {
          amount: {
            value: Math.round(amount * 100),
          },
          expiration_date: new Date(Date.now() + 30 * 60000).toISOString(), // 30 minutos
        },
      ],
      notification_urls: [webhookUrl],
    };

    console.log(
      "📤 Enviando para PagSeguro:",
      JSON.stringify(orderData, null, 2)
    );

    const psResponse = await fetch(`${PAGSEGURO_API_URL}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAGSEGURO_TOKEN}`,
        "Content-Type": "application/json",
        "x-api-version": "4.0",
      },
      body: JSON.stringify(orderData),
    });

    const responseText = await psResponse.text();
    console.log("📥 Resposta PagSeguro (raw):", responseText);

    if (!psResponse.ok) {
      console.error("❌ Erro PagSeguro STATUS:", psResponse.status);
      console.error("❌ Erro PagSeguro BODY:", responseText);

      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText };
      }

      return res.status(500).json({
        error: "Erro ao criar cobrança no PagSeguro",
        details: errorData,
        status: psResponse.status,
      });
    }

    const psOrder = JSON.parse(responseText);
    console.log("✅ Cobrança criada:", psOrder.id);

    const qrCode = psOrder.qr_codes?.[0];

    if (!qrCode) {
      console.error("❌ QR Code não gerado");
      return res
        .status(500)
        .json({ error: "QR Code não foi gerado pelo PagSeguro" });
    }

    // Salvar pagamento no banco
    console.log("💾 Salvando pagamento no banco...");

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          user_id: user_id,
          amount: amount,
          status: "pending",
          payment_method: "pix",
          pix_code: qrCode.text,
          payment_id: psOrder.id,
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error("❌ Erro ao salvar pagamento:", paymentError);
      return res.status(500).json({ error: "Erro ao salvar pagamento" });
    }

    // Criar assinatura pendente
    const plans = { "7_dias": 7, "30_dias": 30 };
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plans[plan_type]);

    console.log("📅 Criando assinatura...");

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: user_id,
          plan_type: plan_type,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          payment_id: psOrder.id,
        },
      ])
      .select()
      .single();

    if (subError) {
      console.error("❌ Erro ao criar assinatura:", subError);
      return res.status(500).json({ error: "Erro ao criar assinatura" });
    }

    console.log("✅ Tudo criado com sucesso!");

    // Gerar QR Code base64
    const qrCodeBase64 = await generateQRCodeBase64(qrCode.text);

    // Retornar dados
    return res.status(200).json({
      payment: {
        id: payment.id,
        pagseguro_id: psOrder.id,
        pix_code: qrCode.text,
        qr_code_base64: qrCodeBase64,
      },
      subscription: {
        id: subscription.id,
        expires_at: subscription.expires_at,
      },
    });
  } catch (error) {
    console.error("💥 Erro geral:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
      stack: error.stack,
    });
  }
};

// Gerar QR Code usando API pública
async function generateQRCodeBase64(pixCode) {
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      pixCode
    )}`;
    const response = await fetch(qrUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
  } catch (error) {
    console.error("Erro ao gerar QR Code:", error);
    return null;
  }
}
