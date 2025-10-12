// api/webhook-mercadopago.js
// Webhook para receber notificações do Mercado Pago

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

export default async function handler(req, res) {
  // Permitir apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, data, action } = req.body;

    console.log("📩 Webhook recebido do Mercado Pago");
    console.log("Type:", type);
    console.log("Action:", action);
    console.log("Data ID:", data?.id);

    // Responder rapidamente ao Mercado Pago (importante!)
    res.status(200).json({ received: true });

    // Processar apenas notificações de pagamento
    if (type !== "payment") {
      console.log("ℹ️ Notificação ignorada (não é pagamento)");
      return;
    }

    // Validar configurações
    if (!MERCADOPAGO_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("❌ Variáveis de ambiente não configuradas");
      return;
    }

    console.log("🔍 Buscando detalhes do pagamento no Mercado Pago...");

    // Buscar detalhes do pagamento no Mercado Pago
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!paymentResponse.ok) {
      console.error("❌ Erro ao buscar pagamento:", paymentResponse.status);
      return;
    }

    const payment = await paymentResponse.json();

    console.log("💳 Pagamento encontrado:");
    console.log("  ID:", payment.id);
    console.log("  Status:", payment.status);
    console.log("  Valor:", payment.transaction_amount);

    // Inicializar Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extrair dados dos metadados
    const userId = payment.metadata?.user_id;
    const planType = payment.metadata?.plan_type;

    if (!userId || !planType) {
      console.error("❌ Metadados incompletos:", payment.metadata);
      return;
    }

    console.log("👤 User ID:", userId);
    console.log("📦 Plano:", planType);

    // Processar conforme status do pagamento
    if (payment.status === "approved") {
      console.log("✅ Pagamento APROVADO - Ativando assinatura...");

      // Buscar pagamento pendente no banco
      const { data: dbPayments, error: findError } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (findError) {
        console.error("❌ Erro ao buscar pagamento:", findError);
        return;
      }

      if (!dbPayments || dbPayments.length === 0) {
        console.error("❌ Pagamento não encontrado no banco");
        return;
      }

      const dbPaymentId = dbPayments[0].id;
      console.log("💾 Pagamento encontrado no banco:", dbPaymentId);

      // Atualizar status do pagamento
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "approved",
          pix_code:
            payment.point_of_interaction?.transaction_data?.qr_code || null,
        })
        .eq("id", dbPaymentId);

      if (paymentError) {
        console.error("❌ Erro ao atualizar pagamento:", paymentError);
        return;
      }

      console.log("✅ Status do pagamento atualizado");

      // Ativar assinatura
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (subError) {
        console.error("❌ Erro ao ativar assinatura:", subError);
        return;
      }

      console.log("🎉 ASSINATURA ATIVADA COM SUCESSO!");
      console.log("   User:", userId);
      console.log("   Plano:", planType);
    } else if (
      payment.status === "rejected" ||
      payment.status === "cancelled"
    ) {
      console.log("❌ Pagamento REJEITADO/CANCELADO");

      // Atualizar status do pagamento
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ status: "rejected" })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (paymentError) {
        console.error("❌ Erro ao atualizar pagamento:", paymentError);
      }

      // Marcar assinatura como expirada
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (subError) {
        console.error("❌ Erro ao expirar assinatura:", subError);
      }

      console.log("📝 Pagamento e assinatura marcados como rejeitados");
    } else if (payment.status === "pending") {
      console.log("⏳ Pagamento ainda PENDENTE");
    } else {
      console.log("ℹ️ Status não processado:", payment.status);
    }
  } catch (error) {
    console.error("💥 ERRO no webhook:", error);
    console.error("Stack:", error.stack);
    // Não retornar erro para não fazer o MP reenviar
  }
}
