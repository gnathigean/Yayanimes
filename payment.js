// payment.js - Mercado Pago Integration (FIXED - Delete Orphan Subscriptions)
// Sistema de pagamento com Mercado Pago - Remove assinaturas órfãs

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

  // Verificar e limpar assinaturas pendentes
  await checkAndCleanPendingPayments(user.id);
});

// ===========================
// VERIFICAR E LIMPAR ASSINATURAS ÓRFÃS
// ===========================

async function checkAndCleanPendingPayments(userId) {
  try {
    console.log("🔍 Verificando pagamentos pendentes...");

    // Buscar assinatura pendente
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (subError && subError.code !== "PGRST116") {
      console.error("❌ Erro ao buscar assinatura:", subError);
      return;
    }

    if (!subscription) {
      console.log("✅ Nenhuma assinatura pendente encontrada");
      return;
    }

    console.log("📦 Assinatura pendente encontrada:", subscription.id);

    // Buscar pagamento associado
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("subscription_id", subscription.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payError && payError.code !== "PGRST116") {
      console.error("❌ Erro ao buscar pagamento:", payError);
    }

    // Se não tem pagamento OU não tem pix_code
    if (!payment || !payment.pix_code) {
      console.log("⚠️ Assinatura órfã detectada (sem pagamento válido)");

      // Verificar se é antiga (mais de 5 minutos)
      const createdAt = new Date(subscription.created_at);
      const now = new Date();
      const diffMinutes = (now - createdAt) / 1000 / 60;

      if (diffMinutes > 5) {
        console.log("🗑️ Removendo assinatura órfã antiga...");

        // Deletar assinatura órfã
        const { error: deleteError } = await supabase
          .from("subscriptions")
          .delete()
          .eq("id", subscription.id);

        if (deleteError) {
          console.error("❌ Erro ao deletar assinatura órfã:", deleteError);
          showMessage(
            "⚠️ Detectada assinatura incompleta. Tente novamente.",
            "info"
          );
        } else {
          console.log("✅ Assinatura órfã removida com sucesso");
          showMessage(
            "ℹ️ Assinatura anterior removida. Gere um novo código.",
            "info"
          );
        }
      } else {
        console.log("⏳ Assinatura recente sem pagamento. Aguardando...");
        showMessage("⏳ Aguarde alguns segundos e tente novamente.", "info");
      }

      return;
    }

    // Tem pagamento válido - verificar expiração
    const createdAt = new Date(payment.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / 1000 / 60;

    console.log(`⏱️ Tempo decorrido: ${diffMinutes.toFixed(1)} minutos`);

    if (diffMinutes > 30) {
      console.log("⏰ Pagamento expirado (>30min)");

      // Atualizar status para expirado
      await supabase
        .from("payments")
        .update({ status: "expired" })
        .eq("id", payment.id);

      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id);

      showMessage(
        "⏰ O código PIX anterior expirou. Gere um novo código.",
        "info"
      );
      return;
    }

    // Pagamento válido - exibir QR Code existente
    console.log(
      "✅ Pagamento válido encontrado! Exibindo QR Code existente..."
    );

    const plan = PLANS[subscription.plan_type];

    showMessage("✅ Código PIX válido encontrado!", "success");

    // Esconder botão de gerar
    const generateBtn = document.getElementById("generate-pix-btn");
    if (generateBtn) {
      generateBtn.style.display = "none";
    }

    // Exibir QR Code existente
    displayPixCode(
      payment.pix_code,
      payment.qr_code_base64,
      plan.name,
      plan.price,
      diffMinutes
    );

    // Iniciar verificação automática
    startPaymentCheck(subscription.id);

    currentPaymentId = payment.id;
  } catch (error) {
    console.error("💥 Erro ao verificar pagamento pendente:", error);
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

    // Desabilitar botão
    const btn = document.getElementById("generate-pix-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Processando...";
    }

    // Verificar assinaturas pendentes
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (subscriptions && subscriptions.length > 0) {
      console.log(
        `🔍 Encontradas ${subscriptions.length} assinatura(s) pendente(s)`
      );

      // Buscar pagamento válido
      for (const sub of subscriptions) {
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("subscription_id", sub.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (payment && payment.pix_code) {
          // Verificar se não expirou
          const createdAt = new Date(payment.created_at);
          const now = new Date();
          const diffMinutes = (now - createdAt) / 1000 / 60;

          if (diffMinutes <= 30) {
            console.log("✅ Reutilizando código PIX pendente existente");

            const plan = PLANS[sub.plan_type];

            if (btn) btn.style.display = "none";

            displayPixCode(
              payment.pix_code,
              payment.qr_code_base64,
              plan.name,
              plan.price,
              diffMinutes
            );

            startPaymentCheck(sub.id);
            currentPaymentId = payment.id;

            showMessage("✅ Exibindo código PIX pendente", "success");
            return;
          }
        }
      }

      // Se chegou aqui, todas as assinaturas pendentes não tem pagamento válido
      console.log("🗑️ Removendo assinaturas órfãs...");

      for (const sub of subscriptions) {
        await supabase.from("subscriptions").delete().eq("id", sub.id);
      }

      console.log("✅ Assinaturas órfãs removidas");
    }

    // Criar novo pagamento
    const planType = localStorage.getItem("selected_plan");
    const plan = PLANS[planType];

    if (!plan) {
      throw new Error("Plano não encontrado");
    }

    console.log("📦 Criando novo pagamento para:", plan.name);

    if (btn) {
      btn.textContent = "⏳ Gerando código PIX...";
    }

    const paymentData = {
      user_id: user.id,
      plan_type: planType,
      amount: plan.price,
      email: user.email,
    };

    console.log("📤 Enviando requisição...");

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

    console.log("📊 Status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText || "Erro desconhecido" };
      }

      console.error("❌ Erro da API:", errorData);

      // Se ainda der erro de duplicata, significa que a API criou a assinatura mas não removemos
      if (errorData.details && errorData.details.includes("duplicate key")) {
        showMessage("⚠️ Erro de sincronização. Recarregando página...", "info");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      throw new Error(errorData.error || "Erro ao criar pagamento");
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ Erro ao fazer parse:", e);
      throw new Error("Resposta inválida da API");
    }

    console.log("✅ Dados recebidos:", data);

    if (!data.payment || !data.payment.pix_code) {
      console.error("❌ Dados incompletos:", data);
      throw new Error("Código PIX não foi gerado");
    }

    console.log("✅ Pagamento criado!");
    console.log("🎫 Payment ID:", data.payment.id);
    console.log("💰 Mercado Pago ID:", data.payment.mercadopago_id);

    currentPaymentId = data.payment.id;

    if (btn) btn.style.display = "none";

    displayPixCode(
      data.payment.pix_code,
      data.payment.qr_code_base64,
      plan.name,
      plan.price,
      0
    );

    startPaymentCheck(data.subscription.id);

    showMessage("✅ Código PIX gerado com sucesso!", "success");
  } catch (error) {
    console.error("💥 Erro:", error);
    showMessage(`❌ ${error.message}`, "error");

    const btn = document.getElementById("generate-pix-btn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🔄 Tentar Novamente";
    }
  }
}

// ===========================
// EXIBIR QR CODE
// ===========================

function displayPixCode(
  pixCode,
  qrCodeBase64,
  planName,
  planPrice,
  minutesElapsed = 0
) {
  console.log("🖼️ Exibindo QR Code...");

  const generateBtn = document.getElementById("generate-pix-btn");
  if (generateBtn) {
    generateBtn.style.display = "none";
  }

  const pixSection = document.getElementById("pix-section");
  if (pixSection) {
    pixSection.style.display = "block";
  }

  const qrImg = document.getElementById("pix-qrcode-img");
  if (qrImg) {
    if (qrCodeBase64) {
      qrImg.src = `data:image/png;base64,${qrCodeBase64}`;
    } else {
      const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        pixCode
      )}`;
      qrImg.src = qrcodeUrl;
    }

    qrImg.onerror = function () {
      this.src = "https://via.placeholder.com/300x300?text=QR+Code+Error";
    };
  }

  const pixCodeInput = document.getElementById("pix-code");
  if (pixCodeInput) {
    pixCodeInput.value = pixCode;
  }

  const remainingMinutes = Math.max(0, 30 - minutesElapsed);
  const timeWarning =
    remainingMinutes < 5
      ? `⚠️ Restam apenas ${Math.floor(remainingMinutes)} minutos!`
      : `⏰ Válido por ${Math.floor(remainingMinutes)} minutos`;

  const paymentStatus = document.getElementById("payment-status");
  if (paymentStatus) {
    paymentStatus.style.display = "block";
    paymentStatus.innerHTML = `
      <div style="text-align: center; padding: 20px; background: #e0f2fe; border-radius: 8px; margin-top: 20px;">
        <p style="color: #0369a1; font-weight: 600; font-size: 16px; margin-bottom: 10px;">
          ⏳ Aguardando pagamento...
        </p>
        <p style="color: ${
          remainingMinutes < 5 ? "#dc2626" : "#666"
        }; font-size: 14px; font-weight: 600;">
          ${timeWarning}
        </p>
        <p style="color: #666; font-size: 13px; margin-top: 8px;">
          Verificando automaticamente a cada 3 segundos
        </p>
        <div style="margin-top: 15px;">
          <div style="width: 40px; height: 40px; border: 4px solid rgba(102, 126, 234, 0.2); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
      </div>
    `;
  }

  console.log("✅ QR Code exibido!");
}

// ===========================
// COPIAR CÓDIGO PIX
// ===========================

function copyPixCode() {
  const pixCodeElement = document.getElementById("pix-code");

  if (!pixCodeElement) {
    showMessage("❌ Erro ao copiar código", "error");
    return;
  }

  const pixCode = pixCodeElement.value;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(pixCode)
      .then(() => {
        showMessage("✅ Código PIX copiado!", "success");
      })
      .catch(() => {
        copyFallback(pixCodeElement);
      });
  } else {
    copyFallback(pixCodeElement);
  }
}

function copyFallback(element) {
  try {
    element.select();
    element.setSelectionRange(0, 99999);
    document.execCommand("copy");
    showMessage("✅ Código PIX copiado!", "success");
  } catch (err) {
    showMessage("❌ Erro ao copiar. Copie manualmente.", "error");
  }
}

// ===========================
// VERIFICAÇÃO DE PAGAMENTO
// ===========================

async function startPaymentCheck(subscriptionId) {
  let attempts = 0;
  const maxAttempts = 600;

  console.log("🔄 Iniciando verificação automática...");

  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }

  paymentCheckInterval = setInterval(async () => {
    attempts++;

    try {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", subscriptionId)
        .maybeSingle();

      console.log(
        `🔍 Verificação ${attempts}: ${subscription?.status || "N/A"}`
      );

      if (subscription && subscription.status === "active") {
        clearInterval(paymentCheckInterval);
        console.log("🎉 PAGAMENTO CONFIRMADO!");

        localStorage.removeItem("selected_plan");

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
                Redirecionando...
              </p>
            </div>
          `;
        }

        setTimeout(() => {
          window.location.href = "content.html";
        }, 2000);
      }

      if (attempts >= maxAttempts) {
        clearInterval(paymentCheckInterval);

        const paymentStatus = document.getElementById("payment-status");
        if (paymentStatus) {
          paymentStatus.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px; margin-top: 20px;">
              <p style="color: #dc2626; font-weight: 600; font-size: 16px;">
                ⏰ Código PIX expirado
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
  }, 3000);
}

// ===========================
// VERIFICAÇÃO MANUAL
// ===========================

async function checkPaymentStatus() {
  showMessage("🔄 Verificando pagamento...", "info");

  try {
    const user = await checkAuth();

    if (!user) {
      showMessage("❌ Usuário não autenticado", "error");
      return;
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      showMessage("⏳ Nenhum pagamento encontrado", "info");
      return;
    }

    if (subscription.status === "active") {
      showMessage("✅ Pagamento confirmado!", "success");
      localStorage.removeItem("selected_plan");
      setTimeout(() => {
        window.location.href = "content.html";
      }, 2000);
    } else {
      showMessage(`⏳ Status: ${subscription.status}`, "info");
    }
  } catch (error) {
    showMessage("❌ Erro ao verificar", "error");
  }
}

// ===========================
// MENSAGENS
// ===========================

function showMessage(message, type = "info") {
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

  setTimeout(() => {
    messageEl.style.animation = "slideOut 0.3s ease";
    setTimeout(() => messageEl.remove(), 300);
  }, 5000);
}

// ===========================
// ANIMAÇÕES
// ===========================

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// ===========================
// EXPOR FUNÇÕES
// ===========================

window.generatePixPayment = generatePixPayment;
window.copyPixCode = copyPixCode;
window.checkPaymentStatus = checkPaymentStatus;

console.log("🎯 Funções registradas!");
