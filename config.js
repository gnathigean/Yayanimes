// config.js
// Configuração do Supabase

// SUBSTITUA com suas credenciais do Supabase
const SUPABASE_URL = "https://asyrgavjapvyfxtyblnu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeXJnYXZqYXB2eWZ4dHlibG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ0MTIsImV4cCI6MjA3NTc2MDQxMn0.cTxS6Q-EX_zpU1tIu29LonBA4Ad468fxuVDn4ix64So";

// Verificar se biblioteca Supabase foi carregada
if (typeof window.supabase === "undefined") {
  console.error(
    "❌ Biblioteca Supabase não carregada! Verifique o script CDN."
  );
} else {
  console.log("✅ Biblioteca Supabase detectada");

  try {
    // Inicializar cliente Supabase
    window.supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    console.log("✅ Supabase Client inicializado com sucesso!");
    console.log("🔗 URL:", SUPABASE_URL);
  } catch (error) {
    console.error("❌ Erro ao inicializar Supabase:", error);
  }
}

// Configuração dos planos
const PLANS = {
  "7_dias": {
    name: "7 Dias",
    price: 19.9,
    days: 7,
    description: "Acesso por 7 dias",
  },
  "30_dias": {
    name: "30 Dias",
    price: 49.9,
    days: 30,
    description: "Acesso por 30 dias",
  },
};

// Verificar se usuário está autenticado
async function checkAuth() {
  try {
    if (!window.supabase) {
      console.error("❌ Supabase não disponível em checkAuth");
      return null;
    }

    const {
      data: { user },
      error,
    } = await window.supabase.auth.getUser();

    if (error) {
      console.error("❌ Erro em checkAuth:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("❌ Exceção em checkAuth:", error);
    return null;
  }
}

// Verificar se usuário tem assinatura ativa
async function checkSubscription(userId) {
  try {
    if (!window.supabase) {
      console.error("❌ Supabase não disponível em checkSubscription");
      return null;
    }

    const now = new Date().toISOString();

    const { data, error } = await window.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("expires_at", now)
      .maybeSingle(); // MUDANÇA: usar maybeSingle() ao invés de single()

    if (error) {
      if (error.code === "PGRST116") {
        console.log("ℹ️ Nenhuma assinatura ativa encontrada");
      } else {
        console.error("❌ Erro ao buscar assinatura:", error);
      }
      return null;
    }

    if (data) {
      console.log("✅ Assinatura ativa encontrada:", data);
    } else {
      console.log("ℹ️ Nenhuma assinatura ativa encontrada");
    }

    return data;
  } catch (error) {
    console.error("❌ Exceção em checkSubscription:", error);
    return null;
  }
}

// Formatar data brasileira
function formatDateBR(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Formatar moeda brasileira
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

console.log("✅ config.js carregado!");
console.log("📋 Planos disponíveis:", Object.keys(PLANS));
