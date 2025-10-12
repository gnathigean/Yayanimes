// api/create-payment.js
// Endpoint para criar pagamentos PIX com Mercado Pago de forma segura

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responder OPTIONS para preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Permitir apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🚀 Iniciando criação de pagamento...");
  console.log("📝 Body recebido:", req.body);

  try {
    const { user_id, plan_type, amount, email } = req.body;

    // Validar dados
    if (!user_id || !plan_type || !amount || !email) {
      console.error("❌ Dados incompletos:", {
        user_id,
        plan_type,
        amount,
        email,
      });
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // Validar variáveis de ambiente
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MERCADOPAGO_ACCESS_TOKEN) {
      console.error("❌ Variáveis de ambiente não configuradas");
      return res
        .status(500)
        .json({ error: "Configuração do servidor incompleta" });
    }

    console.log("✅ Variáveis de ambiente OK");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar se usuário existe
    console.log("🔍 Verificando usuário:", user_id);

    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError) {
      console.error("❌ Erro ao buscar usuário:", userError);

      // Se não existe, criar o perfil
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

      console.log("✅ Perfil criado com sucesso");
    } else {
      console.log("✅ Usuário encontrado");
    }

    // Verificar se já tem assinatura ativa
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

    if (existingSub) {
      console.log("⚠️ Usuário já possui assinatura ativa");
      return res
        .status(400)
        .json({ error: "Usuário já possui assinatura ativa" });
    }

    // Construir URL do webhook corretamente
    const webhookUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhook-mercadopago`
      : `https://${req.headers.host}/api/webhook-mercadopago`;

    console.log("🔔 Webhook URL:", webhookUrl);

    // Criar pagamento no Mercado Pago
    console.log("💳 Criando pagamento no Mercado Pago...");

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${user_id}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(amount),
        description: `Assinatura ${plan_type} - Sistema Premium`,
        payment_method_id: "pix",
        payer: {
          email: email,
          first_name: email.split("@")[0],
        },
        notification_url: webhookUrl,
        metadata: {
          user_id: user_id,
          plan_type: plan_type,
        },
      }),
    });

    if (!mpResponse.ok) {
      const error = await mpResponse.json();
      console.error("❌ Erro Mercado Pago:", error);
      return res.status(500).json({
        error: "Erro ao criar pagamento no Mercado Pago",
        details: error.message,
      });
    }

    const mpPayment = await mpResponse.json();
    console.log("✅ Pagamento criado no Mercado Pago:", mpPayment.id);

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
          pix_code: mpPayment.point_of_interaction.transaction_data.qr_code,
          payment_id: String(mpPayment.id),
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error("❌ Erro ao salvar pagamento:", paymentError);
      return res.status(500).json({ error: "Erro ao salvar pagamento" });
    }

    console.log("✅ Pagamento salvo no banco");

    // Criar assinatura pendente
    const plans = {
      "7_dias": 7,
      "30_dias": 30,
    };

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
          payment_id: String(mpPayment.id),
        },
      ])
      .select()
      .single();

    if (subError) {
      console.error("❌ Erro ao criar assinatura:", subError);
      return res.status(500).json({ error: "Erro ao criar assinatura" });
    }

    console.log("✅ Assinatura criada com sucesso!");

    // Retornar dados do pagamento
    return res.status(200).json({
      payment: {
        id: payment.id,
        mercadopago_id: mpPayment.id,
        pix_code: mpPayment.point_of_interaction.transaction_data.qr_code,
        qr_code_base64:
          mpPayment.point_of_interaction.transaction_data.qr_code_base64,
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
    });
  }
};
