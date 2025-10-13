// payment.js - Mercado Pago Integration (FIXED)
// Sistema de pagamento com Mercado Pago - Versão Corrigida

console.log("✅ payment.js carregado (Mercado Pago)");

let currentPaymentId = null;
let paymentCheckInterval = null;

// ===========================
// INICIALIZAÇÃO
// ===========================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📄 Página de pagamento carregada");

  const user = await checkAuth();

  if (!user) {
    console.warn("❌ Usuário não autenticado");
    showMessage("❌ Você precisa estar logado", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return;
  }

  console.log("✅ Usuário autenticado:", user.email);

  // Verificar se já existe assinatura ativa
  await checkExistingSubscription(user.id);

  const planType = localStorage.getItem("selected_plan");
  if (!planType || !PLANS[planType]) {
    console.warn("❌ Plano não selecionado ou inválido");
    showMessage("❌ Selecione um plano primeiro", "error");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    return;
  }

  console.log("✅ Plano selecionado:", planType);
  displayPlanDetails(planType);
});

// ===========================
// VERIFICAR ASSINATURA EXISTENTE
// ===========================

async function checkExistingSubscription(userId) {
  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao verificar assinatura:", error);
      return;
    }

    if (subscription) {
      console.log("📦 Assinatura existente encontrada:", subscription.status);

      if (subscription.status === "active") {
        showMessage("✅ Você já tem uma assinatura ativa!", "info");
        setTimeout(() => {
          window.location.href = "content.html";
        }, 2000);
        return;
      }

      if (subscription.status === "pending") {
        showMessage(
          "⏳ Você tem um pagamento pendente. Aguardando confirmação...",
          "info"
        );
        // Permitir gerar novo código se o pendente expirou
      }
    }
  } catch (error) {
    console.error("💥 Erro ao verificar assinatura:", error);
  }
}

// ===========================
// EXIBIR DETALHES DO PLANO
// ===========================

function displayPlanDetails(planType) {
  const plan = PLANS[planType];

  const planNameEl = document.getElementById("plan-name");
  const planDurationEl = document.getElementById("plan-duration");
  const planPriceEl = document.getElementById("plan-price");

  if (planNameEl) planNameEl.textContent = plan.name;
  if (planDurationEl) planDurationEl.textContent = plan.description;
  if (planPriceEl) planPriceEl.textContent = formatCurrency(plan.price);

  console.log("📋 Detalhes do plano exibidos:", plan.name);
}

// ===========================
// GERAR PAGAMENTO PIX
// ===========================

async function generatePixPayment() {
  console.log("💳 Iniciando geração de pagamento PIX...");

  try {
    // Verificar autenticação
    const user = await checkAuth();
    if (!user) {
      showMessage("❌ Você precisa estar logado", "error");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }

    console.log("✅ Usuário autenticado:", user.email);

    // Obter plano selecionado
    const planType = localStorage.getItem("selected_plan");
    const plan = PLANS[planType];

    if (!plan) {
      throw new Error("Plano não encontrado");
    }

    console.log("📦 Plano:", plan.name, "- Valor:", plan.price);

    // Desabilitar botão
    const btn = document.getElementById("generate-pix-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Gerando código PIX...";
    }

    // Preparar dados do pagamento com flag para atualizar assinatura existente
    const paymentData = {
      user_id: user.id,
      plan_type: planType,
      amount: plan.price,
      email: user.email,
      update_existing: true, // NOVO: Flag para atualizar assinatura existente
    };

    console.log("📤 Enviando requisição para criar pagamento...");
    console.log("📦 Dados:", paymentData);

    // Chamar API de criação de pagamento
    const response = await fetch(
      "https://yayanimes.vercel.app/api/create-payment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      }
    );

    console.log("📊 Status da resposta:", response.status);

    // Ler resposta
    const responseText = await response.text();
    console.log("📦 Resposta bruta:", responseText);

    // Verificar erro
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText || "Erro desconhecido" };
      }

      console.error("❌ Erro da API:", errorData);

      // Mensagem específica para assinatura duplicada
      if (errorData.details && errorData.details.includes("duplicate key")) {
        throw new Error(
          "Você já possui uma assinatura. Aguarde o pagamento atual ou contate o suporte."
        );
      }

      throw new Error(
        errorData.error || errorData.details || "Erro ao criar pagamento"
      );
    }

    // Parse da resposta
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ Erro ao fazer parse da resposta:", e);
      throw new Error("Resposta inválida da API");
    }

    console.log("✅ Dados recebidos:", data);

    // Validar dados recebidos
    if (!data.payment || !data.payment.pix_code) {
      console.error("❌ Dados incompletos:", data);
      throw new Error("Código PIX não foi gerado");
    }

    console.log("✅ Pagamento criado com sucesso!");
    console.log("🎫 Payment ID:", data.payment.id);
    console.log("💰 Mercado Pago ID:", data.payment.mercadopago_id);
    console.log("📄 Subscription ID:", data.subscription.id);

    // Salvar ID do pagamento
    currentPaymentId = data.payment.id;

    // Exibir QR Code
    displayPixCode(
      data.payment.pix_code,
      data.payment.qr_code_base64,
      plan.name,
      plan.price
    );

    // Iniciar verificação automática
    startPaymentCheck(data.subscription.id);

    showMessage("✅ Código PIX gerado com sucesso!", "success");
  } catch (error) {
    console.error("💥 Erro ao gerar pagamento:", error);
    showMessage(`❌ Erro: ${error.message}`, "error");

    // Reabilitar botão
    const btn = document.getElementById("generate-pix-btn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🔄 Gerar Código PIX";
    }
  }
}

// ===========================
// EXIBIR QR CODE
// ===========================

function displayPixCode(pixCode, qrCodeBase64, planName, planPrice) {
  console.log("🖼️ Exibindo QR Code...");
  console.log("  - PIX Code:", pixCode ? "✅" : "❌");
  console.log("  - QR Base64:", qrCodeBase64 ? "✅" : "❌");

  // Esconder botão de gerar
  const generateBtn = document.getElementById("generate-pix-btn");
  if (generateBtn) {
    generateBtn.style.display = "none";
  }

  // Mostrar seção PIX
  const pixSection = document.getElementById("pix-section");
  if (pixSection) {
    pixSection.style.display = "block";
  }

  // Definir imagem do QR Code
  const qrImg = document.getElementById("pix-qrcode-img");
  if (qrImg) {
    if (qrCodeBase64) {
      qrImg.src = `data:image/png;base64,${qrCodeBase64}`;
      console.log("✅ QR Code carregado via Base64");
    } else {
      // Fallback: usar API pública
      const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        pixCode
      )}`;
      qrImg.src = qrcodeUrl;
      console.log("✅ QR Code carregado via API pública");
    }

    qrImg.onerror = function () {
      console.error("❌ Erro ao carregar QR Code");
      this.src = "https://via.placeholder.com/300x300?text=QR+Code+Error";
    };
  }

  // Preencher código PIX
  const pixCodeInput = document.getElementById("pix-code");
  if (pixCodeInput) {
    pixCodeInput.value = pixCode;
  }

  // Atualizar informações do plano
  const planInfoEl = document.getElementById("plan-info");
  if (planInfoEl) {
    planInfoEl.innerHTML = `
      <p style="color: #666; font-size: 14px; margin: 5px 0;">
        <strong>Plano:</strong> ${planName}
      </p>
      <p style="color: #666; font-size: 14px; margin: 5px 0;">
        <strong>Valor:</strong> ${formatCurrency(planPrice)}
      </p>
    `;
  }

  // Mostrar status de pagamento
  const paymentStatus = document.getElementById("payment-status");
  if (paymentStatus) {
    paymentStatus.style.display = "block";
    paymentStatus.innerHTML = `
      <div style="text-align: center; padding: 20px; background: #e0f2fe; border-radius: 8px; margin-top: 20px;">
        <p style="color: #0369a1; font-weight: 600; font-size: 16px; margin-bottom: 10px;">
          ⏳ Aguardando pagamento...
        </p>
        <p style="color: #666; font-size: 14px;">
          Verificando automaticamente a cada 3 segundos
        </p>
        <div style="margin-top: 15px;">
          <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid rgba(102, 126, 234, 0.2); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  console.log("✅ QR Code exibido com sucesso!");
}

// ===========================
// COPIAR CÓDIGO PIX
// ===========================

function copyPixCode() {
  console.log("📋 Copiando código PIX...");

  const pixCodeElement = document.getElementById("pix-code");

  if (!pixCodeElement) {
    console.error("❌ Elemento pix-code não encontrado");
    showMessage("❌ Erro ao copiar código", "error");
    return;
  }

  const pixCode = pixCodeElement.value;

  // Tentar copiar usando API moderna
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(pixCode)
      .then(() => {
        console.log("✅ Código copiado via Clipboard API");
        showMessage("✅ Código PIX copiado!", "success");
      })
      .catch((err) => {
        console.error("❌ Erro ao copiar via Clipboard API:", err);
        copyFallback(pixCodeElement);
      });
  } else {
    // Fallback para navegadores antigos
    copyFallback(pixCodeElement);
  }
}

function copyFallback(element) {
  try {
    element.select();
    element.setSelectionRange(0, 99999);
    document.execCommand("copy");
    console.log("✅ Código copiado via execCommand");
    showMessage("✅ Código PIX copiado!", "success");
  } catch (err) {
    console.error("❌ Erro no fallback:", err);
    showMessage("❌ Erro ao copiar. Copie manualmente.", "error");
  }
}

// ===========================
// VERIFICAÇÃO DE PAGAMENTO
// ===========================

async function startPaymentCheck(subscriptionId) {
  let attempts = 0;
  const maxAttempts = 600; // 30 minutos (600 * 3s = 1800s = 30min)

  console.log("🔄 Iniciando verificação automática de pagamento...");
  console.log("📌 Subscription ID:", subscriptionId);

  paymentCheckInterval = setInterval(async () => {
    attempts++;

    try {
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", subscriptionId)
        .maybeSingle();

      if (error) {
        console.error("❌ Erro ao verificar pagamento:", error);
        return;
      }

      console.log(
        `🔍 Verificação ${attempts}/${maxAttempts}: Status = ${
          subscription?.status || "não encontrado"
        }`
      );

      if (subscription && subscription.status === "active") {
        clearInterval(paymentCheckInterval);
        console.log("🎉 PAGAMENTO CONFIRMADO!");

        // Remover plano selecionado
        localStorage.removeItem("selected_plan");

        // Atualizar status
        const paymentStatus = document.getElementById("payment-status");
        if (paymentStatus) {
          paymentStatus.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #d1fae5; border-radius: 8px; margin-top: 20px;">
              <p style="color: #10b981; font-weight: 600; font-size: 20px; margin-bottom: 10px;">
                ✅ Pagamento Confirmado!
              </p>
              <p style="color: #059669; font-size: 16px;">
                Bem-vindo ao YayaAnimes Premium! 🎉
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">
                Redirecionando para o conteúdo...
              </p>
            </div>
          `;
        }

        // Redirecionar
        setTimeout(() => {
          window.location.href = "content.html";
        }, 2000);
      }

      // Timeout
      if (attempts >= maxAttempts) {
        clearInterval(paymentCheckInterval);
        console.warn("⏰ Timeout na verificação de pagamento");

        const paymentStatus = document.getElementById("payment-status");
        if (paymentStatus) {
          paymentStatus.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px; margin-top: 20px;">
              <p style="color: #dc2626; font-weight: 600; font-size: 16px;">
                ⏰ Tempo esgotado
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 10px;">
                O código PIX expirou. Por favor, gere um novo código.
              </p>
              <button onclick="window.location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                🔄 Gerar Novo Código
              </button>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error("💥 Erro na verificação:", error);
    }
  }, 3000); // Verificar a cada 3 segundos
}

// ===========================
// VERIFICAÇÃO MANUAL
// ===========================

async function checkPaymentStatus() {
  console.log("🔍 Verificação manual iniciada...");
  showMessage("🔄 Verificando pagamento...", "info");

  try {
    const user = await checkAuth();

    if (!user) {
      showMessage("❌ Usuário não autenticado", "error");
      return;
    }

    // Buscar assinatura mais recente
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Erro ao verificar:", error);
      showMessage("❌ Erro ao verificar pagamento", "error");
      return;
    }

    if (!subscription) {
      showMessage("⏳ Nenhum pagamento encontrado ainda", "info");
      return;
    }

    console.log("📦 Assinatura encontrada:", subscription);

    if (subscription.status === "active") {
      showMessage("✅ Pagamento confirmado! Redirecionando...", "success");
      localStorage.removeItem("selected_plan");
      setTimeout(() => {
        window.location.href = "content.html";
      }, 2000);
    } else if (subscription.status === "pending") {
      showMessage("⏳ Ainda aguardando confirmação do pagamento", "info");
    } else {
      showMessage(`❌ Status: ${subscription.status}`, "error");
    }
  } catch (error) {
    console.error("💥 Erro:", error);
    showMessage("❌ Erro ao verificar status", "error");
  }
}

// ===========================
// MENSAGENS DE FEEDBACK
// ===========================

function showMessage(message, type = "info") {
  console.log(`📢 Mensagem [${type}]:`, message);

  // Criar elemento de mensagem se não existir
  let messageContainer = document.getElementById("message-container");

  if (!messageContainer) {
    messageContainer = document.createElement("div");
    messageContainer.id = "message-container";
    messageContainer.style.cssText =
      "position: fixed; top: 20px; right: 20px; z-index: 10000;";
    document.body.appendChild(messageContainer);
  }

  const colors = {
    success: { bg: "#d1fae5", text: "#10b981", border: "#10b981" },
    error: { bg: "#fee2e2", text: "#dc2626", border: "#dc2626" },
    info: { bg: "#e0f2fe", text: "#0369a1", border: "#0369a1" },
  };

  const color = colors[type] || colors.info;

  const messageEl = document.createElement("div");
  messageEl.style.cssText = `
    background: ${color.bg};
    color: ${color.text};
    border: 2px solid ${color.border};
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease;
    min-width: 300px;
    font-size: 14px;
    font-weight: 500;
  `;
  messageEl.textContent = message;

  messageContainer.appendChild(messageEl);

  // Remover após 5 segundos
  setTimeout(() => {
    messageEl.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      messageEl.remove();
    }, 300);
  }, 5000);
}

// ===========================
// ANIMAÇÕES CSS
// ===========================

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);

// ===========================
// EXPOR FUNÇÕES GLOBALMENTE
// ===========================

window.generatePixPayment = generatePixPayment;
window.copyPixCode = copyPixCode;
window.checkPaymentStatus = checkPaymentStatus;

console.log("🎯 Funções payment.js registradas globalmente!");
console.log("  - generatePixPayment()");
console.log("  - copyPixCode()");
console.log("  - checkPaymentStatus()");
