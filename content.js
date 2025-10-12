// content.js
// Lógica da página de conteúdo premium

// Inicializar página de conteúdo
document.addEventListener("DOMContentLoaded", async () => {
  await verifyAccessAndLoadContent();
});

// Verificar acesso e carregar conteúdo
async function verifyAccessAndLoadContent() {
  const user = await checkAuth();

  if (!user) {
    // Não está logado
    showAccessDenied();
    return;
  }

  // Mostrar email do usuário
  document.getElementById("user-email").textContent = user.email;

  // Verificar assinatura
  const subscription = await checkSubscription(user.id);

  if (!subscription) {
    // Não tem assinatura ativa
    showAccessDenied();
    return;
  }

  // Verificar se a assinatura expirou
  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);

  if (now > expiresAt) {
    // Assinatura expirada - atualizar status
    await updateSubscriptionStatus(subscription.id, "expired");
    showAccessDenied();
    return;
  }

  // Tem acesso - mostrar conteúdo
  showPremiumContent(subscription);
}

// Mostrar acesso negado
function showAccessDenied() {
  document.getElementById("access-denied").style.display = "block";
  document.getElementById("premium-content").style.display = "none";
}

// Mostrar conteúdo premium
function showPremiumContent(subscription) {
  document.getElementById("access-denied").style.display = "none";
  document.getElementById("premium-content").style.display = "block";

  const planName = PLANS[subscription.plan_type].name;
  document.getElementById("sub-plan").textContent = planName;
  document.getElementById("sub-expires").textContent = formatDateBR(
    subscription.expires_at
  );
}

// Atualizar status da assinatura
async function updateSubscriptionStatus(subscriptionId, status) {
  try {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: status })
      .eq("id", subscriptionId);

    if (error) throw error;
  } catch (error) {
    console.error("Erro ao atualizar status da assinatura:", error);
  }
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
