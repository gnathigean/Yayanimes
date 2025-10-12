// app.js
// Lógica principal da página inicial

// Inicializar página
document.addEventListener("DOMContentLoaded", async () => {
  await initializePage();
});

// Inicializar página
async function initializePage() {
  const user = await checkAuth();

  if (user) {
    // Usuário logado
    showUserInfo(user);
    await checkUserSubscription(user);
  } else {
    // Usuário não logado
    showAuthButtons();
  }
}

// Mostrar informações do usuário
function showUserInfo(user) {
  document.getElementById("auth-buttons").style.display = "none";
  document.getElementById("user-info").style.display = "flex";
  document.getElementById("user-email").textContent = user.email;
}

// Mostrar botões de autenticação
function showAuthButtons() {
  document.getElementById("auth-buttons").style.display = "flex";
  document.getElementById("user-info").style.display = "none";
  document.getElementById("subscription-info").style.display = "none";
}

// Verificar assinatura do usuário
async function checkUserSubscription(user) {
  const subscription = await checkSubscription(user.id);

  if (subscription) {
    // Tem assinatura ativa
    showSubscriptionInfo(subscription);
  }
}

// Mostrar informações da assinatura
function showSubscriptionInfo(subscription) {
  const planName = PLANS[subscription.plan_type].name;

  document.getElementById("subscription-info").style.display = "block";
  document.getElementById("sub-plan").textContent = planName;
  document.getElementById("sub-status").textContent = "Ativo";
  document.getElementById("sub-expires").textContent = formatDateBR(
    subscription.expires_at
  );
}

// Selecionar plano
async function selectPlan(planType) {
  const user = await checkAuth();

  if (!user) {
    alert("Você precisa fazer login para adquirir um plano!");
    window.location.href = "login.html";
    return;
  }

  // Verificar se já tem assinatura ativa
  const subscription = await checkSubscription(user.id);
  if (subscription) {
    alert("Você já possui uma assinatura ativa!");
    return;
  }

  // Redirecionar para página de pagamento
  localStorage.setItem("selected_plan", planType);
  window.location.href = "payment.html";
}

// Logout
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
}
