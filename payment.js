// payment.js - PagSeguro Integration
// Sistema de pagamento com PagSeguro/PagBank

console.log("✅ payment.js carregado (PagSeguro)");

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

// Gerar pagamento PIX
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
    btn.textContent = "Gerando código PIX...";

    console.log("💳 Criando pagamento no PagSeguro...");

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

    const responseText = await response.text();
    console.log("Resposta recebida:", responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText };
      }

      console.error("Erro da API:", errorData);
      throw new Error(errorData.error || "Erro ao criar pagamento");
    }

    const { payment, subscription } = JSON.parse(responseText);

    console.log("✅ Pagamento criado:", payment);

    currentPaymentId = payment.id;

    displayPixCode(payment.pix_code, payment.qr_code_base64);
    startPaymentCheck(subscription.id);
  } catch (error) {
    console.error("💥 Erro:", error);
    alert("Erro ao gerar pagamento: " + error.message);

    const btn = document.getElementById("generate-pix-btn");
    btn.disabled = false;
    btn.textContent = "Gerar Código PIX";
  }
}

function displayPixCode(pixCode, qrCodeBase64) {
  document.getElementById("generate-pix-btn").style.display = "none";
  document.getElementById("pix-section").style.display = "block";

  if (qrCodeBase64) {
    document.getElementById(
      "pix-qrcode-img"
    ).src = `data:image/png;base64,${qrCodeBase64}`;
  } else {
    // Fallback para API pública
    const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      pixCode
    )}`;
    document.getElementById("pix-qrcode-img").src = qrcodeUrl;
  }

  document.getElementById("pix-code").value = pixCode;
  document.getElementById("payment-status").style.display = "block";
  document.getElementById("payment-status").innerHTML = `
    <p style="color: #0369a1; font-weight: 600;">Aguardando pagamento...</p>
    <p style="color: #666; font-size: 14px; margin-top: 8px;">Verificando automaticamente a cada 3 segundos</p>
    <div class="loading-spinner"></div>
  `;
}

function copyPixCode() {
  const pixCodeElement = document.getElementById("pix-code");
  pixCodeElement.select();
  pixCodeElement.setSelectionRange(0, 99999);

  navigator.clipboard
    .writeText(pixCodeElement.value)
    .then(() => {
      alert("✅ Código PIX copiado com sucesso!");
    })
    .catch(() => {
      try {
        document.execCommand("copy");
        alert("✅ Código PIX copiado!");
      } catch (err) {
        alert("❌ Erro ao copiar código. Copie manualmente.");
      }
    });
}

async function startPaymentCheck(subscriptionId) {
  let attempts = 0;
  const maxAttempts = 600; // 30 minutos

  console.log("🔄 Iniciando verificação de pagamento...");

  paymentCheckInterval = setInterval(async () => {
    attempts++;

    try {
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", subscriptionId)
        .single();

      if (error) {
        console.error("Erro ao verificar:", error);
        return;
      }

      console.log(`Verificação ${attempts}: Status = ${subscription?.status}`);

      if (subscription && subscription.status === "active") {
        clearInterval(paymentCheckInterval);
        console.log("🎉 Pagamento confirmado!");

        localStorage.removeItem("selected_plan");

        document.getElementById("payment-status").innerHTML = `
          <p style="color: #10b981; font-weight: 600; font-size: 18px;">✅ Pagamento confirmado!</p>
          <p style="color: #666; margin-top: 8px;">Redirecionando...</p>
        `;

        setTimeout(() => {
          window.location.href = "content.html";
        }, 2000);
      }

      if (attempts >= maxAttempts) {
        clearInterval(paymentCheckInterval);
        document.getElementById("payment-status").innerHTML =
          '<p style="color: #dc2626; font-weight: 600;">⏰ Código PIX expirou. Gere um novo código.</p>';
      }
    } catch (error) {
      console.error("Erro na verificação:", error);
    }
  }, 3000);
}

// Expor funções globalmente
window.generatePixPayment = generatePixPayment;
window.copyPixCode = copyPixCode;

console.log("🎯 Funções registradas!");
