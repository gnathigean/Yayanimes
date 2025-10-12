// config.js
// Configuração do Supabase

// SUBSTITUA com suas credenciais do Supabase
const SUPABASE_URL = "https://asyrgavjapvyfxtyblnu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeXJnYXZqYXB2eWZ4dHlibG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ0MTIsImV4cCI6MjA3NTc2MDQxMn0.cTxS6Q-EX_zpU1tIu29LonBA4Ad468fxuVDn4ix64So";

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Verificar se usuário tem assinatura ativa
async function checkSubscription(userId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .single();

  if (error) {
    console.log("Nenhuma assinatura ativa encontrada");
    return null;
  }

  return data;
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
