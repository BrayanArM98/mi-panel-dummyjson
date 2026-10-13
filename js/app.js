'use strict';

/* =========================================================
   CONFIGURACIÓN Y ESTADO
   ========================================================= */
const API = 'https://dummyjson.com';
const CLAVE_TOKEN = 'accessToken';

/* =========================================================
   REFERENCIAS AL DOM
   ========================================================= */
const vistaLogin = document.getElementById('vista-login');
const vistaPanel = document.getElementById('vista-panel');

const formLogin = document.getElementById('form-login');
const inputUsuario = document.getElementById('usuario');
const inputPassword = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const errorLogin = document.getElementById('error-login');

/* =========================================================
   UTILIDADES
   ========================================================= */
function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token);
}

function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

// Muestra una vista ('login' o 'panel') y oculta la otra
function mostrarVista(nombre) {
  vistaLogin.hidden = nombre !== 'login';
  vistaPanel.hidden = nombre !== 'panel';
}

// Muestra un mensaje dentro de la página (nunca con alert)
function mostrarMensaje(elemento, texto, tipo = 'error') {
  elemento.textContent = texto;
  elemento.className = `mensaje mensaje-${tipo}`;
  elemento.hidden = false;
}

function ocultarMensaje(elemento) {
  elemento.hidden = true;
  elemento.textContent = '';
}

/* =========================================================
   1. INICIAR SESIÓN  →  POST /auth/login
   ========================================================= */
async function iniciarSesion(evento) {
  evento.preventDefault(); // evita que el formulario recargue la página
  ocultarMensaje(errorLogin);

  const username = inputUsuario.value.trim();
  const password = inputPassword.value;

  if (!username || !password) {
    mostrarMensaje(errorLogin, 'Escribe tu usuario y tu contraseña.');
    return;
  }

  // Mientras esperamos la respuesta, el botón se deshabilita
  btnLogin.disabled = true;
  btnLogin.textContent = 'Entrando…';

  try {
    const respuesta = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, expiresInMins: 60 }),
    });

    // fetch NO falla con 400/401: hay que revisar response.ok
    if (!respuesta.ok) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    const datos = await respuesta.json();
    guardarToken(datos.accessToken);
    formLogin.reset();
    mostrarVista('panel');
  } catch (error) {
    // TypeError = no hubo conexión con el servidor
    const texto = error instanceof TypeError
      ? 'No se pudo conectar con el servidor. Revisa tu internet.'
      : error.message;
    mostrarMensaje(errorLogin, texto);
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
  }
}

/* =========================================================
   EVENTOS
   ========================================================= */
formLogin.addEventListener('submit', iniciarSesion);
