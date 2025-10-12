// payment.js - VERSÃO CORRIGIDA
// Sistema de pagamento com Mercado Pago

// IMPORTANTE: Configure o Access Token nas variáveis de ambiente da Vercel
// Por segurança, o token NÃO deve estar no código do frontend
// Em produção, a criação do pagamento deve ser feita pelo backend

let currentPaymentId = null;
let paymentCheckInterval = null;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const planType = localStorage.getItem("selected_plan");
  if (!planType || !PLANS[planType]) {
    window.location.href = "index.html";
    return;
  }

  displayPlanDetails(planType);
});

function displayPlanDetails(planType) {
  const plan = PLANS[planType];

  document.getElementById("plan-name").textContent = plan.name;
  document.getElementById("plan-duration").textContent = plan.description;
  document.getElementById("plan-price").textContent = formatCurrency(
    plan.price
  );
}

/* ============================================
// OPÇÃO 1: Sistema Simulado (para testes)
async function generatePixPayment() {
  const user = await checkAuth();
  const planType = localStorage.getItem("selected_plan");
  const plan = PLANS[planType];

  if (!user) {
    alert("Erro: Usuário não autenticado!");
    window.location.href = "login.html";
    return;
  }

  try {
    document.getElementById("generate-pix-btn").disabled = true;
    document.getElementById("generate-pix-btn").textContent = "Gerando...";

    // ============================================
    // SIMULAÇÃO - REMOVER EM PRODUÇÃO
    // ============================================
    console.log("⚠️ MODO SIMULAÇÃO ATIVO");

    const pixCode = generateSimulatedPixCode();

    // Salvar pagamento no Supabase
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert([
        {
          user_id: user.id,
          amount: plan.price,
          status: "pending",
          payment_method: "pix",
          pix_code: pixCode,
        },
      ])
      .select()
      .single();

    if (paymentError) throw paymentError;

    currentPaymentId = payment.id;

    // Criar assinatura pendente
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.days);

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert([
        {
          user_id: user.id,
          plan_type: planType,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          payment_id: payment.id,
        },
      ])
      .select()
      .single();

    if (subError) throw subError;

    // Exibir PIX simulado
    displaySimulatedPixCode(pixCode);

    // Simular aprovação após 10 segundos
    setTimeout(async () => {
      await approvePayment(currentPaymentId, subscription.id);
    }, 10000);
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao gerar pagamento: " + error.message);
    document.getElementById("generate-pix-btn").disabled = false;
    document.getElementById("generate-pix-btn").textContent =
      "Gerar Código PIX";
  }
}

// Gerar código PIX simulado
function generateSimulatedPixCode() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "00020126580014br.gov.bcb.pix";
  for (let i = 0; i < 50; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Exibir PIX simulado
function displaySimulatedPixCode(pixCode) {
  document.getElementById("generate-pix-btn").style.display = "none";
  document.getElementById("pix-section").style.display = "block";

  // QR Code via API pública
  const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    pixCode
  )}`;
  document.getElementById("pix-qrcode-img").src = qrcodeUrl;
  document.getElementById("pix-code").value = pixCode;
  document.getElementById("payment-status").style.display = "block";
}

// Copiar código PIX
function copyPixCode() {
  const pixCodeElement = document.getElementById("pix-code");
  pixCodeElement.select();
  pixCodeElement.setSelectionRange(0, 99999);

  try {
    document.execCommand("copy");
    alert("✅ Código PIX copiado!");
  } catch (err) {
    // Fallback para navegadores modernos
    navigator.clipboard.writeText(pixCodeElement.value).then(() => {
      alert("✅ Código PIX copiado!");
    });
  }
}

// Aprovar pagamento
async function approvePayment(paymentId, subscriptionId) {
  try {
    const { error: paymentError } = await supabase
      .from("payments")
      .update({ status: "approved" })
      .eq("id", paymentId);

    if (paymentError) throw paymentError;

    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscriptionId);

    if (subError) throw subError;

    localStorage.removeItem("selected_plan");

    alert("✅ Pagamento aprovado! Sua assinatura está ativa.");
    window.location.href = "content.html";
  } catch (error) {
    console.error("Erro ao aprovar pagamento:", error);
    alert("Erro ao processar pagamento. Contate o suporte.");
  }
}

 ============================================
   OPÇÃO 2: Integração REAL com Mercado Pago
   Descomente e use em produção
   ============================================ */

async function generatePixPaymentReal() {
  const user = await checkAuth();
  const planType = localStorage.getItem("selected_plan");
  const plan = PLANS[planType];

  if (!user) {
    alert("Erro: Usuário não autenticado!");
    window.location.href = "login.html";
    return;
  }

  try {
    document.getElementById("generate-pix-btn").disabled = true;
    document.getElementById("generate-pix-btn").textContent = "Gerando...";

    // Chamar API do backend para criar pagamento
    const response = await fetch("/api/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        plan_type: planType,
        amount: plan.price,
        email: user.email,
      }),
    });

    if (!response.ok) throw new Error("Erro ao criar pagamento");

    const { payment, subscription } = await response.json();

    currentPaymentId = payment.id;

    displayPixCode(payment.pix_code, payment.qr_code_base64);

    startPaymentCheck(payment.mercadopago_id, subscription.id);
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao gerar pagamento: " + error.message);
    document.getElementById("generate-pix-btn").disabled = false;
    document.getElementById("generate-pix-btn").textContent =
      "Gerar Código PIX";
  }
}

function displayPixCode(pixCode, qrCodeBase64) {
  document.getElementById("generate-pix-btn").style.display = "none";
  document.getElementById("pix-section").style.display = "block";

  document.getElementById(
    "pix-qrcode-img"
  ).src = `data:image/png;base64,${qrCodeBase64}`;
  document.getElementById("pix-code").value = pixCode;
  document.getElementById("payment-status").style.display = "block";
}

async function startPaymentCheck(mpPaymentId, subscriptionId) {
  paymentCheckInterval = setInterval(async () => {
    try {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", subscriptionId)
        .single();

      if (subscription && subscription.status === "active") {
        clearInterval(paymentCheckInterval);
        alert("✅ Pagamento aprovado! Sua assinatura está ativa.");
        window.location.href = "content.html";
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
    }
  }, 3000); // Verificar a cada 3 segundos

  // Timeout de 30 minutos
  setTimeout(() => {
    clearInterval(paymentCheckInterval);
    alert("⏰ Código PIX expirado. Gere um novo código.");
  }, 30 * 60 * 1000);
}
