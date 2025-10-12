// payment.js - VERSÃO CORRIGIDA E FUNCIONAL
// Sistema de pagamento com Mercado Pago

console.log("✅ payment.js carregado com sucesso!");

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

// FUNÇÃO PRINCIPAL - Integração REAL com Mercado Pago via API
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
    const btn = document.getElementById("generate-pix-btn");
    btn.disabled = true;
    btn.textContent = "Gerando...";

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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao criar pagamento");
    }

    const { payment, subscription } = await response.json();

    currentPaymentId = payment.id;

    displayPixCode(payment.pix_code, payment.qr_code_base64);

    startPaymentCheck(subscription.id);
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro ao gerar pagamento: " + error.message);
    const btn = document.getElementById("generate-pix-btn");
    btn.disabled = false;
    btn.textContent = "Gerar Código PIX";
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

function copyPixCode() {
  const pixCodeElement = document.getElementById("pix-code");
  pixCodeElement.select();
  pixCodeElement.setSelectionRange(0, 99999);

  navigator.clipboard
    .writeText(pixCodeElement.value)
    .then(() => {
      alert("✅ Código PIX copiado!");
    })
    .catch(() => {
      // Fallback para navegadores antigos
      try {
        document.execCommand("copy");
        alert("✅ Código PIX copiado!");
      } catch (err) {
        alert("❌ Erro ao copiar código");
      }
    });
}

async function startPaymentCheck(subscriptionId) {
  let attempts = 0;
  const maxAttempts = 600; // 30 minutos (600 * 3 segundos)

  paymentCheckInterval = setInterval(async () => {
    attempts++;

    try {
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", subscriptionId)
        .single();

      if (error) {
        console.error("Erro ao verificar pagamento:", error);
        return;
      }

      if (subscription && subscription.status === "active") {
        clearInterval(paymentCheckInterval);
        localStorage.removeItem("selected_plan");
        alert("✅ Pagamento aprovado! Sua assinatura está ativa.");
        window.location.href = "content.html";
      }

      // Timeout após 30 minutos
      if (attempts >= maxAttempts) {
        clearInterval(paymentCheckInterval);
        document.getElementById("payment-status").innerHTML =
          '<p style="color: #dc2626;">⏰ Código PIX expirou. Gere um novo código.</p>';
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
    }
  }, 3000); // Verificar a cada 3 segundos
}
