// auth.js
// Lógica de autenticação (Login e Registro)

// Função de Login
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    // Login bem-sucedido
    window.location.href = "index.html";
  } catch (error) {
    errorMessage.textContent = "Erro ao fazer login: " + error.message;
    errorMessage.style.display = "block";
  }
}

// Função de Registro
async function handleRegister(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const errorMessage = document.getElementById("error-message");

  // Validar senhas
  if (password !== confirmPassword) {
    errorMessage.textContent = "As senhas não coincidem!";
    errorMessage.style.display = "block";
    return;
  }

  if (password.length < 6) {
    errorMessage.textContent = "A senha deve ter no mínimo 6 caracteres!";
    errorMessage.style.display = "block";
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) throw error;

    // Criar perfil do usuário
    if (data.user) {
      await supabase.from("user_profiles").insert([
        {
          id: data.user.id,
          email: email,
        },
      ]);
    }

    // Registro bem-sucedido
    alert(
      "Cadastro realizado com sucesso! Verifique seu email para confirmar."
    );
    window.location.href = "login.html";
  } catch (error) {
    errorMessage.textContent = "Erro ao criar conta: " + error.message;
    errorMessage.style.display = "block";
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
