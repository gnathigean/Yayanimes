// api/webhook-pagseguro.js
// Webhook para receber notificações do PagSeguro

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;

const PAGSEGURO_API_URL =
  process.env.PAGSEGURO_SANDBOX === "true"
    ? "https://sandbox.api.pagseguro.com"
    : "https://api.pagseguro.com";

module.exports = async function handler(req, res) {
  console.log("📩 Webhook PagSeguro recebido");
  console.log("Method:", req.method);
  console.log("Body:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // PagSeguro envia apenas o ID da transação
    const notificationData = req.body;

    // Pode vir como objeto ou string
    let orderId;

    if (typeof notificationData === "string") {
      orderId = notificationData;
    } else if (notificationData.id) {
      orderId = notificationData.id;
    } else if (notificationData.charges?.[0]?.id) {
      orderId = notificationData.charges[0].id;
    }

    if (!orderId) {
      console.log("⚠️ Webhook sem ID identificável");
      return res.status(200).json({ received: true });
    }

    console.log("🔍 Buscando detalhes da ordem:", orderId);

    // Responder rapidamente
    res.status(200).json({ received: true });

    // Buscar detalhes da ordem
    const orderResponse = await fetch(
      `${PAGSEGURO_API_URL}/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${PAGSEGURO_TOKEN}`,
          "Content-Type": "application/json",
          "x-api-version": "4.0",
        },
      }
    );

    if (!orderResponse.ok) {
      console.error("❌ Erro ao buscar ordem:", orderResponse.status);
      return;
    }

    const order = await orderResponse.json();
    console.log("📦 Ordem recebida:", JSON.stringify(order, null, 2));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extrair status do pagamento
    const charge = order.charges?.[0];
    const status = charge?.status || order.status;

    console.log("💳 Status do pagamento:", status);

    // Status do PagSeguro:
    // PAID = Pago
    // WAITING = Aguardando pagamento
    // CANCELED = Cancelado
    // DECLINED = Recusado

    if (status === "PAID") {
      console.log("✅ Pagamento aprovado!");

      // Buscar pagamento no banco pelo payment_id
      const { data: dbPayments } = await supabase
        .from("payments")
        .select("id, user_id")
        .eq("payment_id", orderId)
        .eq("status", "pending")
        .limit(1);

      if (!dbPayments || dbPayments.length === 0) {
        console.error("❌ Pagamento não encontrado no banco");
        return;
      }

      const dbPayment = dbPayments[0];

      // Atualizar pagamento
      await supabase
        .from("payments")
        .update({ status: "approved" })
        .eq("id", dbPayment.id);

      console.log("✅ Pagamento atualizado no banco");

      // Ativar assinatura
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("user_id", dbPayment.user_id)
        .eq("payment_id", orderId)
        .eq("status", "pending");

      console.log("🎉 Assinatura ativada!");
    } else if (status === "CANCELED" || status === "DECLINED") {
      console.log("❌ Pagamento cancelado/recusado");

      await supabase
        .from("payments")
        .update({ status: "rejected" })
        .eq("payment_id", orderId)
        .eq("status", "pending");

      console.log("✅ Status atualizado para rejeitado");
    } else {
      console.log("ℹ️ Status intermediário:", status);
    }
  } catch (error) {
    console.error("💥 Erro no webhook:", error);
  }
};
