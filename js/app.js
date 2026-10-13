'use strict';

/* =========================================================
   CONFIGURACIÓN Y ESTADO
   ========================================================= */
const API = 'https://dummyjson.com';
const CLAVE_TOKEN = 'accessToken';

let usuarioActual = null; // datos que regresa /auth/me
let tareas = [];          // arreglo local con las tareas (la "fuente de verdad")
let filtroActual = 'todas';
let textoBusqueda = '';

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

const resumenEl = document.getElementById('resumen');
const progresoEl = document.getElementById('progreso');
const listaEl = document.getElementById('lista-tareas');
const mensajeTareas = document.getElementById('mensaje-tareas');
const botonesFiltro = document.querySelectorAll('.filtro');
const inputBuscador = document.getElementById('buscador');

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

/* =========================================================
   3. LISTAR LAS TAREAS  →  GET /todos/user/{id}
   ========================================================= */
async function cargarTareas(idUsuario) {
  listaEl.innerHTML = '<li class="vacio">Cargando tareas…</li>';
  ocultarMensaje(mensajeTareas);

  try {
    // limit=0 pide todas las tareas del usuario, no solo las primeras
    const respuesta = await fetch(`${API}/todos/user/${idUsuario}?limit=0`);
    if (!respuesta.ok) {
      throw new Error(`No se pudieron cargar las tareas (error ${respuesta.status}).`);
    }
    const datos = await respuesta.json();
    tareas = datos.todos;
    pintarTareas();
  } catch (error) {
    tareas = [];
    listaEl.innerHTML = '';
    const texto = error instanceof TypeError
      ? 'No se pudo conectar con el servidor.'
      : error.message;
    mostrarMensaje(mensajeTareas, texto);
  }
}

// reduce: cuenta cuántas tareas están completadas
function calcularResumen(lista) {
  const total = lista.length;
  const completadas = lista.reduce(
    (cuenta, tarea) => (tarea.completed ? cuenta + 1 : cuenta),
    0,
  );
  const pendientes = total - completadas;
  const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);
  return { total, completadas, pendientes, porcentaje };
}

function pintarResumen() {
  const { total, completadas, pendientes, porcentaje } = calcularResumen(tareas);

  // map: convierte cada contador en una "tarjetita" de HTML
  resumenEl.innerHTML = [
    { valor: total, texto: 'Total' },
    { valor: completadas, texto: 'Completadas' },
    { valor: pendientes, texto: 'Pendientes' },
    { valor: `${porcentaje}%`, texto: 'Avance' },
  ]
    .map((c) => `<div class="contador"><strong>${c.valor}</strong><span>${c.texto}</span></div>`)
    .join('');

  progresoEl.style.width = `${porcentaje}%`;
}

// filter + sort: decide qué tareas se ven y en qué orden
function obtenerTareasVisibles() {
  const busqueda = textoBusqueda.toLowerCase();

  return tareas
    .filter((tarea) => {
      if (filtroActual === 'pendientes') return !tarea.completed;
      if (filtroActual === 'completadas') return tarea.completed;
      return true; // 'todas'
    })
    .filter((tarea) => tarea.todo.toLowerCase().includes(busqueda))
    // Pendientes primero; dentro de cada grupo, las más nuevas (id mayor) arriba
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b.id - a.id);
}

function pintarTareas() {
  const visibles = obtenerTareasVisibles();

  if (visibles.length === 0) {
    const texto = tareas.length === 0
      ? 'No tienes tareas todavía.'
      : 'Ninguna tarea coincide con el filtro o la búsqueda.';
    listaEl.innerHTML = `<li class="vacio">${texto}</li>`;
  } else {
    // map: cada objeto tarea se convierte en un <li>
    listaEl.innerHTML = visibles
      .map((tarea) => `
        <li class="tarea ${tarea.completed ? 'hecha' : ''}" data-id="${tarea.id}">
          <label class="check">
            <input type="checkbox" class="toggle" ${tarea.completed ? 'checked' : ''}>
            <span class="texto">${escaparHTML(tarea.todo)}</span>
          </label>
          ${tarea.local ? '<span class="etiqueta" title="Solo existe en tu navegador">nueva</span>' : ''}
          <button type="button" class="btn-eliminar" title="Eliminar tarea" aria-label="Eliminar tarea">✕</button>
        </li>`)
      .join('');
  }

  pintarResumen();
}

function cambiarFiltro(evento) {
  filtroActual = evento.currentTarget.dataset.filtro;
  botonesFiltro.forEach((boton) => {
    boton.classList.toggle('activo', boton.dataset.filtro === filtroActual);
  });
  pintarTareas();
}

function buscar() {
  textoBusqueda = inputBuscador.value.trim();
  pintarTareas();
}

// Carga todo el panel: primero el perfil y luego las tareas
async function cargarPanel() {
  mostrarVista('panel');
  perfilEl.innerHTML = '<p class="cargando">Cargando perfil…</p>';

  try {
    usuarioActual = await obtenerPerfil();
    pintarPerfil(usuarioActual);
    await cargarTareas(usuarioActual.id);
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
  tareas = [];
  filtroActual = 'todas';
  textoBusqueda = '';
  inputBuscador.value = '';
  botonesFiltro.forEach((boton) => {
    boton.classList.toggle('activo', boton.dataset.filtro === 'todas');
  });
  perfilEl.innerHTML = '';
  listaEl.innerHTML = '';
  ocultarMensaje(mensajeTareas);
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
botonesFiltro.forEach((boton) => boton.addEventListener('click', cambiarFiltro));
inputBuscador.addEventListener('input', buscar);

// Al recargar la página: si hay token, entra directo al panel
function iniciar() {
  if (obtenerToken()) {
    cargarPanel();
  } else {
    mostrarVista('login');
  }
}

iniciar();
