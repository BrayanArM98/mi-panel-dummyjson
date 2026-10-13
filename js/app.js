'use strict';

/* =========================================================
   CONFIGURACIÓN Y ESTADO
   ========================================================= */
const API = 'https://dummyjson.com';
const CLAVE_TOKEN = 'accessToken';

let usuarioActual = null; // datos que regresa /auth/me

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

const btnLogout = document.getElementById('btn-logout');
const perfilEl = document.getElementById('perfil');

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

// Convierte texto en HTML seguro (evita que un texto con <etiquetas> se ejecute)
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto ?? '');
  return div.innerHTML;
}

// Error propio para saber cuándo el servidor respondió 401
class ErrorSesion extends Error {}

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
    await cargarPanel();
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
   2. VER EL PERFIL  →  GET /auth/me
   ========================================================= */
async function obtenerPerfil() {
  const respuesta = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  });

  if (respuesta.status === 401) {
    throw new ErrorSesion('Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar el perfil (error ${respuesta.status}).`);
  }
  return respuesta.json();
}

function pintarPerfil(usuario) {
  const nombreCompleto = `${usuario.firstName} ${usuario.lastName}`;

  // Datos extra del perfil. Con filter quitamos los que vengan vacíos
  // y con map los convertimos en HTML.
  const datosExtra = [
    { etiqueta: 'Usuario', valor: `@${usuario.username}` },
    { etiqueta: 'Edad', valor: usuario.age ? `${usuario.age} años` : '' },
    { etiqueta: 'Teléfono', valor: usuario.phone },
    { etiqueta: 'Ciudad', valor: usuario.address?.city },
    { etiqueta: 'Empresa', valor: usuario.company?.name },
    { etiqueta: 'Puesto', valor: usuario.company?.title },
  ]
    .filter((dato) => dato.valor)
    .map((dato) => `
      <div>
        <dt>${escaparHTML(dato.etiqueta)}</dt>
        <dd>${escaparHTML(dato.valor)}</dd>
      </div>`)
    .join('');

  perfilEl.innerHTML = `
    <img src="${escaparHTML(usuario.image)}" alt="Foto de ${escaparHTML(nombreCompleto)}">
    <h2>${escaparHTML(nombreCompleto)}</h2>
    <p class="correo">${escaparHTML(usuario.email)}</p>
    <dl class="datos">${datosExtra}</dl>
  `;
}

// Carga todo el panel: perfil (y después las tareas)
async function cargarPanel() {
  mostrarVista('panel');
  perfilEl.innerHTML = '<p class="cargando">Cargando perfil…</p>';

  try {
    usuarioActual = await obtenerPerfil();
    pintarPerfil(usuarioActual);
  } catch (error) {
    // Si el servidor respondió 401: borrar token y regresar al login
    if (error instanceof ErrorSesion) {
      cerrarSesion(error.message);
      return;
    }
    const texto = error instanceof TypeError
      ? 'No se pudo conectar con el servidor.'
      : error.message;
    perfilEl.innerHTML = `<p class="mensaje mensaje-error">${escaparHTML(texto)}</p>`;
  }
}

/* =========================================================
   CERRAR SESIÓN
   ========================================================= */
function cerrarSesion(motivo = '') {
  borrarToken();
  usuarioActual = null;
  perfilEl.innerHTML = '';
  mostrarVista('login');

  if (motivo) {
    mostrarMensaje(errorLogin, motivo);
  } else {
    ocultarMensaje(errorLogin);
  }
  inputUsuario.focus();
}

/* =========================================================
   EVENTOS E INICIO
   ========================================================= */
formLogin.addEventListener('submit', iniciarSesion);
btnLogout.addEventListener('click', () => cerrarSesion());

// Al recargar la página: si hay token, entra directo al panel
function iniciar() {
  if (obtenerToken()) {
    cargarPanel();
  } else {
    mostrarVista('login');
  }
}

iniciar();
