# Checklist de revisión manual del frontend

Pruebas manuales en navegador para RentaCar. Complementa las suites automatizadas
(`test:e2e:local`, `test:qa:local`), que validan los flujos a nivel API pero no el
renderizado, los estados de carga ni el layout en pantalla.

## Precondiciones

1. SQL Server disponible con datos demo (`npm run db:seed` desde la raíz del repo).
2. Backend levantado con overrides de SMTP apuntando a Mailpit
   (``SMTP_HOST=localhost SMTP_PORT=1025``); bandeja en http://localhost:8025.
3. Frontend en desarrollo (`npm run dev:frontend`) o build servido; se abre en
   http://localhost:5173 (u otro puerto de Vite).
4. Recomendado probar en Chrome/Edge con DevTools en modo dispositivo.

## Usuarios de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `adminprueba@rentacar.cl` | `PruebaAdmin123` |
| Cliente 1 | `cliente.demo1@rentacar.cl` | `DemoSeed123!` |
| Cliente 2 | `cliente.demo2@rentacar.cl` | `DemoSeed123!` |
| Proveedor 1 | `proveedor.demo1@rentacar.cl` | `DemoSeed123!` |
| Proveedor 2 | `proveedor.demo2@rentacar.cl` | `DemoSeed123!` |

Los clientes y proveedores ya tienen correo confirmado y cuentas activas. Para
probar el flujo completo de registro se usa un correo nuevo (ver Formularios).

## 1. Formularios

- [ ] **Registro**: en `/registro`, enviar vacío muestra los errores de campos
      requeridos (nombre, correo, contraseña). Con datos válidos se crea la cuenta
      y se indica que hay que confirmar el correo.
- [ ] **Confirmación**: el correo de confirmación aparece en Mailpit; al abrir el
      enlace o ingresar el token en `/confirmar-cuenta` la cuenta queda activa y se
      permite iniciar sesión.
- [ ] **Login**: en `/login`, credenciales correctas inician sesión; campos vacíos
      o inválidos muestran mensajes de error sin recargar.
- [ ] **Recuperación de contraseña**: en `/recuperar`, un correo inexistente no
      revela si la cuenta existe, y un correo válido recibe el enlace en Mailpit.
- [ ] **Búsqueda de vehículos**: filtros (sede, fechas, tipo, precio) se aplican y
      cambian los resultados; fechas imposibles muestran aviso.
- [ ] **Reserva**: en el detalle de un vehículo, un rango válido crea la reserva
      (queda PENDIENTE) y se avanza al pago.
- [ ] **Pago simulado**: completar el checkout Webpay simulado confirma la reserva
      (APROBADA); el botón "ir a pagar" está deshabilitado si ya hay una reserva
      activa o superpuesta.
- [ ] **Perfil**: editar datos personales y contraseña persiste los cambios y
      muestra confirmación.
- [ ] **Proveedor**: registrar y editar un vehículo valida campos (patente, precio,
      kilómetros, fechas) y guarda correctamente.
- [ ] **Operaciones/admin**: cambiar estado de arriendo, resolver movimientos de
      devolución y moderar reseñas con las validaciones correspondientes.

## 2. Navegación

- [ ] Las rutas del menú cambian la URL y marcan el enlace activo
      (Inicio, Mi perfil, Admin, Operaciones, Proveedor).
- [ ] Sin sesión el menú muestra "Iniciar sesión"; con sesión muestra los accesos
      según el rol del usuario (cliente solo "Mi perfil"; proveedor además
      "Operaciones" y "Proveedor"; admin además "Admin" y "Operaciones").
- [ ] El botón "Salir" cierra la sesión, revoca el refresh token en el servidor y
      devuelve al inicio con el menú sin sesión.
- [ ] "Inicio"/marca del sitio vuelve a `/` desde cualquier pantalla.
- [ ] Los pasos de reserva (route-steps) reflejan la etapa actual
      (reserva → pago → confirmación).

## 3. Rutas protegidas

- [ ] Sin sesión, `/perfil`, `/proveedor`, `/operaciones` y `/admin` redirigen a
      `/login`.
- [ ] Un cliente con sesión no puede entrar a `/proveedor` ni a `/admin` (redirige
      a `/perfil` o muestra acceso denegado).
- [ ] Un proveedor puede entrar a `/operaciones` y `/proveedor`, pero no a `/admin`.
- [ ] Solo un admin accede a `/admin`.
- [ ] Una ruta inexistente (p. ej. `/hola`) redirige a `/`.

## 4. Mensajes de error

- [ ] Login con contraseña incorrecta muestra un mensaje de error claro.
- [ ] Reutilizar/ingresar un token de confirmación inválido o expirado muestra error.
- [ ] Reservar un vehículo y fechas ya ocupadas por otro cliente muestra el conflicto
      de superposición (409).
- [ ] Confirmar dos veces el mismo pago simulado es rechazado (no se cobra dos veces).
- [ ] Editar con datos inválidos (RUT malo, email mal formado, precios negativos)
      muestra los mensajes del backend en pantalla.
- [ ] Abrir `/vehiculos/:id` de un vehículo inexistente muestra el estado de
      "no encontrado" o redirige, sin romper la página.

## 5. Estados de carga

- [ ] Al abrir la app aparece la pantalla "Preparando RentaCar..." mientras se
      restaura la sesión.
- [ ] Navegar con sesión activa muestra "Cargando tu sesión..." si hace falta antes
      de mostrar la pestaña protegida.
- [ ] El catálogo muestra un estado de carga (spinner/placeholder) mientras
      se cargan los vehículos y luego los resultados.
- [ ] Las listas de reservas, operaciones y reportes muestran estado de carga y un
      estado vacío cuando no hay datos.

## 6. Diseño responsive (DevTools)

Viewports a probar: `1440`, `1024`, `760`, `480` y `360` px de ancho.

- [ ] `1440px`: la cuadrícula de vehículos muestra 4 columnas.
- [ ] `1024px`: KPIs en 3 columnas y vehículos en 2 columnas.
- [ ] `760px`: grids principales en 1 columna, hero apilado (ilustración arriba),
      footer en columna y tabla con scroll horizontal.
- [ ] `480px`: header en columna con navegación debajo; botones de acciones
      (reserva, pago, moderación, paneles) a ancho completo; paginación que envuelve.
- [ ] `360px`: sin desbordes horizontales; textos y campos legibles; touch targets
      de al menos 44px.
- [ ] Las imágenes del hero, detalle y galería se escalan sin recortes bruscos.
- [ ] No hay scroll horizontal global (`body`) en ningún viewport.

## Resultado

- [ ] Se encontró solo alguna mejora visual menor.

---

## Uso

- Marcar cada casilla con `x` a medida que se verifica (`[x]`).
- Reportar fallos en el campo de notas junto al ítem (URL, rol usado, mensaje,
  captura si aplica).
- Los flujos funcionales (backend) ya están cubiertos por `test:e2e:local` y
  `test:qa:local`; este checklist no los repite exhaustivamente, se enfoca en la UI.