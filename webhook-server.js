// webhook-server.js
// Servidor Node.js para receber webhooks do Mercado Pago
// Deploy na Vercel Functions ou Netlify Functions

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// Configurações
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service Key, não Anon Key!
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Endpoint webhook do Mercado Pago
app.post("/webhook/mercadopago", async (req, res) => {
  try {
    const { type, data } = req.body;

    // Responder rapidamente ao Mercado Pago
    res.status(200).send("OK");

    // Processar apenas notificações de pagamento
    if (type !== "payment") return;

    // Buscar detalhes do pagamento
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await paymentResponse.json();

    // Verificar se foi aprovado
    if (payment.status === "approved") {
      const userId = payment.metadata.user_id;
      const planType = payment.metadata.plan_type;

      // Atualizar pagamento no banco
      await supabase
        .from("payments")
        .update({ status: "approved" })
        .eq("payment_id", String(payment.id));

      // Ativar assinatura
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("user_id", userId)
        .eq("payment_id", String(payment.id));

      console.log(`✅ Assinatura ativada para usuário ${userId}`);
    }
  } catch (error) {
    console.error("Erro no webhook:", error);
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
