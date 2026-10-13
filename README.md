# Mi panel con DummyJSON

Página hecha con **HTML, CSS y JavaScript puro** (sin frameworks ni librerías) en la que un usuario inicia sesión, ve su perfil y administra sus tareas usando la API de [DummyJSON](https://dummyjson.com/docs).

**Autor:** Brayan Arturo Rocha Meneses

**Página publicada:** https://brayanarm98.github.io/mi-panel-dummyjson/

**Repositorio:** https://github.com/BrayanArM98/mi-panel-dummyjson

**Usuario de prueba:** `emilys` · **Contraseña:** `emilyspass`

## Estructura

```
index.html      → estructura de las dos vistas (login y panel)
css/styles.css  → estilos responsivos (celular y computadora, modo oscuro)
js/app.js       → toda la lógica
```

## Qué hace

1. **Iniciar sesión** — `POST /auth/login`. Mientras espera, el botón se deshabilita y dice "Entrando…". Si las credenciales están mal, muestra un mensaje en la página. Guarda el `accessToken` en `localStorage`.
2. **Ver el perfil** — `GET /auth/me` con el header `Authorization: Bearer <token>`. Muestra foto, nombre completo, correo, usuario, edad, teléfono, ciudad, empresa y puesto. Al recargar, si hay token entra directo al panel; si el servidor responde 401, borra el token y regresa al login. El botón **Cerrar sesión** borra el token.
3. **Listar tareas** — `GET /todos/user/{id}`. Muestra total, completadas, pendientes y porcentaje de avance, con filtro Todas / Pendientes / Completadas y buscador por texto.
4. **Acciones** — agregar (`POST /todos/add`), marcar completada/pendiente (`PUT /todos/{id}`) y eliminar (`DELETE /todos/{id}`). Como DummyJSON solo simula los cambios, cuando la respuesta es exitosa se actualiza el arreglo `tareas` en el navegador. Las tareas agregadas por el usuario se marcan como `local: true` y al marcarlas o borrarlas no se llama a la API, solo se cambia el arreglo.

## Dónde usé cada método de arreglo y para qué

Todo está en `js/app.js`.

### `map`
- **`pintarPerfil()`**: convierte la lista de datos extra del usuario (usuario, edad, teléfono, etc.) en filas de HTML.
- **`pintarResumen()`**: convierte los cuatro contadores (total, completadas, pendientes, avance) en tarjetitas de HTML.
- **`pintarTareas()`**: convierte cada objeto tarea en un `<li>` para pintar la lista.
- **`cambiarEstado()`**: crea un arreglo nuevo de tareas donde solo la tarea marcada cambia su `completed`.

### `filter`
- **`pintarPerfil()`**: quita los datos del perfil que vengan vacíos para no mostrar filas sin valor.
- **`obtenerTareasVisibles()`**: aplica el filtro Todas / Pendientes / Completadas y, después, el buscador por texto.
- **`eliminarTarea()`**: crea un arreglo nuevo sin la tarea eliminada.

### `reduce`
- **`calcularResumen()`**: recorre las tareas y cuenta cuántas están completadas. Con ese número se calculan las pendientes y el porcentaje de avance.

### `find`
- **`cambiarEstado()`**: busca la tarea por su `id` para saber su estado actual y si es local.
- **`eliminarTarea()`**: busca la tarea por su `id` para saber si es local (no existe en el servidor) antes de llamar a la API.

### `sort`
- **`obtenerTareasVisibles()`**: ordena la lista para que las pendientes salgan primero y, dentro de cada grupo, las más nuevas (id mayor) arriba. Se ordena el resultado de `filter`, que ya es un arreglo nuevo, así que no se modifica el arreglo original.

### `forEach`
- Para agregar el `addEventListener` a cada botón del filtro y para marcar cuál está activo. No se usa ningún `for` clásico para pintar ni contar.

## Reglas técnicas que cumple

- Todas las peticiones usan `async/await` dentro de `try/catch`.
- Se revisa `response.ok` (y `response.status === 401` en el perfil), porque `fetch` no falla solo con un 401 o 404.
- No se usa `var`; solo `const` y `let`.
- Todos los eventos se registran con `addEventListener`; no hay `onclick` en el HTML. La lista usa **delegación de eventos**: un solo listener en el `<ul>` atiende las casillas y los botones de eliminar de todas las tareas.
- Los textos se escapan con `escaparHTML()` antes de insertarlos con `innerHTML`, para que un texto con etiquetas no se ejecute como HTML.
- Diseño responsivo: en celular todo va en una columna; desde 860 px el perfil queda a la izquierda y las tareas a la derecha.

## Cómo correrlo

Abrir `index.html` en el navegador (o con la extensión Live Server de VS Code). No necesita instalar nada.
