// api/create-payment.js
// Criar pagamento PIX via Mercado Pago

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, plan_type, amount, email } = req.body;

    console.log("📥 Requisição recebida:", {
      user_id,
      plan_type,
      amount,
      email,
    });

    // Validar dados
    if (!user_id || !plan_type || !amount || !email) {
      return res.status(400).json({
        error: "Dados incompletos",
        missing: {
          user_id: !user_id,
          plan_type: !plan_type,
          amount: !amount,
          email: !email,
        },
      });
    }

    // Validar variáveis de ambiente
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("❌ Variáveis Supabase não configuradas");
      return res.status(500).json({
        error: "Configuração do servidor incompleta (Supabase)",
      });
    }

    if (
      !MERCADOPAGO_ACCESS_TOKEN ||
      MERCADOPAGO_ACCESS_TOKEN === "SEU_ACCESS_TOKEN_AQUI"
    ) {
      console.error("❌ MERCADOPAGO_ACCESS_TOKEN não configurado");
      return res.status(500).json({
        error:
          "Mercado Pago não configurado. Configure a variável MERCADOPAGO_ACCESS_TOKEN",
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar se já tem assinatura ativa
    const { data: existingSub, error: checkError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user_id)
      .eq("status", "active")
      .maybeSingle(); // MUDANÇA: usar maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("❌ Erro ao verificar assinatura:", checkError);
      return res.status(500).json({
        error: "Erro ao verificar assinatura existente",
        details: checkError.message,
      });
    }

    if (existingSub) {
      return res.status(400).json({
        error: "Usuário já possui assinatura ativa",
        subscription_id: existingSub.id,
      });
    }

    console.log("📄 Criando pagamento no Mercado Pago...");

    // Criar pagamento no Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${user_id}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(amount),
        description: `Assinatura ${plan_type}`,
        payment_method_id: "pix",
        payer: {
          email: email,
          first_name: email.split("@")[0],
        },
        notification_url: `https://${req.headers.host}/api/webhook-mercadopago`,
        metadata: {
          user_id: user_id,
          plan_type: plan_type,
        },
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("❌ Erro Mercado Pago:", mpData);
      return res.status(500).json({
        error: "Erro ao criar pagamento no Mercado Pago",
        details: mpData,
      });
    }

    console.log("✅ Pagamento criado no MP:", mpData.id);

    // Salvar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          user_id: user_id,
          amount: parseFloat(amount),
          status: "pending",
          payment_method: "pix",
          pix_code:
            mpData.point_of_interaction?.transaction_data?.qr_code || null,
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error("❌ Erro ao salvar pagamento:", paymentError);
      return res.status(500).json({
        error: "Erro ao salvar pagamento",
        details: paymentError.message,
      });
    }

    // Criar assinatura pendente
    const plans = { "7_dias": 7, "30_dias": 30 };
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plans[plan_type] || 7));

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: user_id,
          plan_type: plan_type,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          payment_id: String(mpData.id),
        },
      ])
      .select()
      .single();

    if (subError) {
      console.error("❌ Erro ao criar assinatura:", subError);

      // Se falhar, deletar o pagamento criado
      await supabase.from("payments").delete().eq("id", payment.id);

      return res.status(500).json({
        error: "Erro ao criar assinatura",
        details: subError.message,
      });
    }

    console.log("✅ Tudo criado com sucesso");

    // Retornar dados
    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        mercadopago_id: mpData.id,
        pix_code:
          mpData.point_of_interaction?.transaction_data?.qr_code || null,
        qr_code_base64:
          mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      },
      subscription: {
        id: subscription.id,
        expires_at: subscription.expires_at,
      },
    });
  } catch (error) {
    console.error("💥 Erro crítico:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
