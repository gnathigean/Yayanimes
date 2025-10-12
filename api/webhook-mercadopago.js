// api/webhook-mercadopago.js
// Vercel Serverless Function - VERSÃO CORRIGIDA

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

    console.log("📩 Webhook recebido:", { type, action, id: data?.id });

    // Responder rapidamente (Mercado Pago tem timeout)
    res.status(200).json({ received: true });

    // Processar apenas notificações de pagamento
    if (type !== "payment") {
      console.log("ℹ️ Tipo ignorado:", type);
      return;
    }

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log("💳 Status:", payment.status);

    const userId = payment.metadata?.user_id;
    const planType = payment.metadata?.plan_type;

    if (!userId || !planType) {
      console.error("❌ Metadata incompleto");
      return;
    }

    if (payment.status === "approved") {
      console.log("✅ Pagamento aprovado para:", userId);

      // Buscar pagamento pendente mais recente
      const { data: dbPayments } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!dbPayments || dbPayments.length === 0) {
        console.error("❌ Pagamento não encontrado no banco");
        return;
      }

      const dbPaymentId = dbPayments[0].id;

      // Atualizar pagamento
      await supabase
        .from("payments")
        .update({ status: "approved" })
        .eq("id", dbPaymentId);

      // Ativar assinatura
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("user_id", userId)
        .eq("status", "pending");

      console.log("🎉 Assinatura ativada com sucesso!");
    } else if (
      payment.status === "rejected" ||
      payment.status === "cancelled"
    ) {
      console.log("❌ Pagamento rejeitado/cancelado");

      await supabase
        .from("payments")
        .update({ status: "rejected" })
        .eq("user_id", userId)
        .eq("status", "pending");
    }
  } catch (error) {
    console.error("💥 Erro no webhook:", error);
  }
}
