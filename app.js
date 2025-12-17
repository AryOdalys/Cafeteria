// 👉 URL de tu Web App de Google Apps Script
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzsjp8s2kjco5PkG2o_sLgY5CC3528CPTVWFLIOl4EvEUkusg0RIkN1vnsNBfX-aemA8w/exec";
const TOKEN_ACCESS = "AKfycbw51FRk32V9qQPqkXUl11TROvb8jxdR6qcbNHVLNUYkQEV_BncgkK6dEy4385WnzfVG4g"

// Variable global
var credentials = null;

// Recuperar token desde localStorage al cargar la página
window.onload = () => {
  const storedToken = localStorage.getItem("credentials");
  if (storedToken) {
    credentials = storedToken;

    configurarAcceso("admin");
    mostrarSeccion("menu");
    
    console.log("Token cargado desde localStorage:");
  }
};

function removeToken()
{
  localStorage.removeItem("credentials");
  credentials = null;
}
// Función para inicializar el token
function setToken(token = null) {
  if (token) {
    // Si recibimos un token por parámetro
    credentials = token;
    localStorage.setItem("credentials", token);
  } else {
    // Si no recibimos token, lo buscamos en localStorage
    const storedToken = localStorage.getItem("credentials");
    if (storedToken) {
      credentials = storedToken;
    } else {
      console.warn("No hay token disponible ni en parámetro ni en localStorage.");
    }
  }
  return credentials;
}

//Función para decodificar el JWT
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

// 👉 Función genérica para escribir en Google Sheets (añadir, editar, eliminar)
async function escribirEnHoja(hoja, values, accion = "añadir", idToken = null) {
/*
    if (!credentials) {
      alert("No hay token disponible. Inicia sesión primero.");
      return;
    }
*/
    let request = {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        credentials,
        hoja,
        values,
        accion,
        token: "CAFETERIA2025"
      }),
      
    };

  try {
    let res = await fetch(WEB_APP_URL, {
      ...request,
      redirect: "manual" // 👈 evita que el navegador siga el 302 automáticamente
    });

    if(res?.invalidCredentials){
      removeToken();
      window.location.href = "index.html";
    }

    // Si devuelve 302, obtenemos la cabecera Location y hacemos la petición allí
    if (res.status === 302) {
      const redirectUrl = res.headers.get("Location");
      if (!redirectUrl) throw new Error("Redirección sin Location");

      res = await fetch(redirectUrl, request);
    }

    if (!res.ok) {
      console.log(res);
      throw new Error(res?.error || "Respuesta HTTP no OK: " + res.status);
    }

    return await res.json();
  } catch (err) {
    console.error("Error escribiendo en hoja:", err);
    return { ok: false, error: err.message };
  }
}

function validarCredencials(usuario, contrasena) {
  const token = btoa(`${usuario}:${contrasena}`);
  setToken(token);
  return  escribirEnHoja("Usuarios", [usuario, contrasena], "credentials");
}


// 👉 Función genérica para leer datos de una hoja
async function leerHoja(hoja) {
  try {
    const res = await fetch(WEB_APP_URL + "?hoja=" + encodeURIComponent(hoja));
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error("Error escribiendo en hoja", err);
    return { ok: false, error: err.message };
  }
}


/* ===========================
   FUNCIONES COMPARTIDAS (UTILIDADES)
=========================== */

// Mostrar mensajes (error, ok, sugerencias) con auto-ocultado
function mostrarMensaje(elemento, texto, clase) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = clase;
  setTimeout(() => {
    elemento.textContent = "";
    elemento.className = "";
  }, 5000);
}

// Limpiar campos de texto (nombre + precio)
// 👉 Función compartida
function limpiarCampos(nombreInput, precioInput) {
  nombreInput.value = "";
  precioInput.value = "";
}

// Validación de precio en tiempo real (coma → punto, máximo 2 decimales)
// 👉 Función compartida
function configurarValidacionPrecio(inputEl) {
  if (!inputEl) return;

  inputEl.addEventListener("input", function () {
    // Elimina todo lo que no sea número, punto o coma
    let v = this.value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    
    // Evita múltiples puntos decimales
    const partes = v.split(".");
    if (partes.length > 2) v = partes[0] + "." + partes[1];

    // Limita a dos decimales
    if (v.includes(".")) {
      const [entero, dec = ""] = v.split(".");
      v = entero + "." + dec.slice(0, 2);
    }

    this.value = v;
  });

  inputEl.addEventListener("blur", function () {
    const num = parseFloat(this.value.replace(/,/g, "."));
    this.value = isNaN(num) ? "" : num.toFixed(2);
  });
}

// Crear botón de acción (editar/eliminar)
// 👉 Función compartida
function crearBoton(icono, texto) {
  const btn = document.createElement("button");
  btn.className = "btn-icon";
  btn.type = "button";

  const img = document.createElement("img");
  img.src = icono;
  img.alt = texto;
  img.className = "icon";

  const spanTexto = document.createElement("span");
  spanTexto.className = "texto";
  spanTexto.textContent = texto;

  btn.appendChild(img);
  btn.appendChild(spanTexto);
  return btn;
}
/* ===========================
   LOGIN
=========================== */
function validarLogin() {
  const usuario = document.getElementById("usuario")?.value.trim();
  const contrasena = document.getElementById("contrasena")?.value.trim();
  const mensaje = document.getElementById("mensaje");

  if (!mensaje) return;

  const response = validarCredencials(usuario, contrasena);
  // ADMIN
  if (response && response.ok) {
    mensaje.textContent = "";
    mensaje.className = "";
    configurarAcceso("admin");
    mostrarSeccion("menu");
    return;
  }
/*
  // INVITADO
  if (usuario === "invitado" && contrasena === "0000") {
    mensaje.textContent = "";
    mensaje.className = "";
    configurarAcceso("invitado");
    mostrarSeccion("menu");
    return;
  }
*/
  removeToken();
  mensaje.textContent = response.error || "Usuario o contraseña incorrectos.";
  mensaje.className = "error";
  // ERROR
  mostrarMensaje(mensaje, mensaje.textContent, mensaje.className);
}

function configurarAcceso(rol) {
  const btnVenta       = document.querySelector('#menu button[data-seccion="venta"]');
  const btnProductos   = document.querySelector('#menu button[data-seccion="productos"]');
  const btnPromocion   = document.querySelector('#menu button[data-seccion="promocion"]');
  const btnAnteriores  = document.querySelector('#menu button[data-seccion="ventasAnteriores"]');
  const btnOpciones    = document.querySelector('#menu button[data-seccion="opciones"]');

  if (rol === "admin") {
    if (btnVenta)      btnVenta.style.display = "inline-block";
    if (btnProductos)  btnProductos.style.display = "inline-block";
    if (btnPromocion)  btnPromocion.style.display = "inline-block";
    if (btnAnteriores) btnAnteriores.style.display = "inline-block";
    if (btnOpciones)   btnOpciones.style.display = "inline-block";
  }

  if (rol === "invitado") {
    if (btnVenta)      btnVenta.style.display = "inline-block";
    if (btnAnteriores) btnAnteriores.style.display = "inline-block";

    if (btnProductos)  btnProductos.style.display = "none";
    if (btnPromocion)  btnPromocion.style.display = "none";
    if (btnOpciones)   btnOpciones.style.display = "none";
  }
}


/* ===========================
   MENÚ PRINCIPAL
=========================== */
function mostrarSeccion(seccionId) {
  const ids = ["login", "menu", "cafeteria", "productos", "promocion", "ventasAnteriores", "opciones", "cierreCaja","listadoClientes", "cierresAnteriores" ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === seccionId) ? "block" : "none";
  });

  if (seccionId === "cafeteria") {
    const fechaHoyEl = document.getElementById("fechaHoy");
    if (fechaHoyEl) {
      const fecha = new Date();
      const fmt = { year: "numeric", month: "long", day: "numeric" };
      fechaHoyEl.textContent = fecha.toLocaleDateString("es-ES", fmt);
    }
  }

  // 👉 NUEVO: cargar productos desde Google Sheets
  if (seccionId === "productos") {
    (async () => {
      const productos = await leerHoja("Añadir_Productos");
      const lista = document.getElementById("listaProductos");
      if (!lista) return;

      lista.innerHTML = ""; // limpiar lista actual

      productos.forEach(row => {
        const nombre = row[0];
        const precio = parseFloat(row[1]);
        if (nombre && !isNaN(precio)) {
          crearItemInventario(nombre, precio);
        }
      });

      ordenarInventarioPorNombre();
      actualizarSelectVenta();
    })();
  }
}



/* ===========================
   VENTAS (CAFETERÍA)
=========================== */
let total = 0;

// Actualizar precio producto
function actualizarPrecioProducto() {
  const select = document.getElementById("producto");
  const precioEl = document.getElementById("precioProducto");
  if (!select || !precioEl) return;

  const selected = select.selectedOptions[0];
  if (!selected) {
    precioEl.textContent = "0.00 €";
    return;
  }
  const precio = parseFloat(selected.getAttribute("data-precio")) || 0;
  precioEl.textContent = `${precio.toFixed(2)} €`;
}

// Actualizar precio promoción
function actualizarPrecioPromo() {
  const select = document.getElementById("promocionVenta");
  const precioEl = document.getElementById("precioPromo");
  if (!select || !precioEl) return;

  const selected = select.selectedOptions[0];
  if (!selected) {
    precioEl.textContent = "0.00 €";
    return;
  }
  const precio = parseFloat(selected.getAttribute("data-precio")) || 0;
  precioEl.textContent = `${precio.toFixed(2)} €`;
}

// Añadir producto al carrito
function añadirProducto() {
  const select = document.getElementById("producto");
  const cantidadSelect = document.getElementById("cantidad");
  const carrito = document.getElementById("carrito");
  const totalEl = document.getElementById("total");
  const errorEl = document.getElementById("productoError");

  if (!select || !cantidadSelect || !carrito || !totalEl || !errorEl) return;

  const selected = select.selectedOptions[0];
  const cantidad = parseInt(cantidadSelect.value, 10);

  if (!selected || isNaN(cantidad) || cantidad <= 0) {
    errorEl.textContent = "Selecciona un producto y una cantidad válida.";
    errorEl.className = "error";
    return;
  }

  const nombre = selected.value;
  const precio = parseFloat(selected.getAttribute("data-precio"));
  const subtotal = precio * cantidad;

  const li = document.createElement("li");
  li.className = "linea-carrito-item";
  li.setAttribute("data-nombre", nombre);
  li.setAttribute("data-cantidad", cantidad);
  li.setAttribute("data-precio", precio.toFixed(2));

  const span = document.createElement("span");
  span.textContent = `${nombre} x${cantidad} — ${subtotal.toFixed(2)} €`;

  const btnEliminar = document.createElement("button");
  btnEliminar.className = "btn-eliminar-carrito";
  btnEliminar.innerHTML = `<img src="img/eliminarcarrito.jpg" alt="Eliminar">`;

  btnEliminar.addEventListener("click", () => {
    li.remove();
    total -= subtotal;
    totalEl.textContent = total.toFixed(2);
  });

  li.appendChild(span);
  li.appendChild(btnEliminar);
  carrito.appendChild(li);

  total += subtotal;
  totalEl.textContent = total.toFixed(2);

  errorEl.textContent = "";
  errorEl.className = "";
  cantidadSelect.value = "";
  select.value = "";
  actualizarPrecioProducto();
}

// Añadir promoción al carrito
function añadirPromocion() {
  const select = document.getElementById("promocionVenta");
  const carrito = document.getElementById("carrito");
  const totalEl = document.getElementById("total");
  const errorEl = document.getElementById("promoError");

  if (!select || !carrito || !totalEl || !errorEl) return;

  const selected = select.selectedOptions[0];
  if (!selected) {
    errorEl.textContent = "Selecciona una promoción válida.";
    errorEl.className = "error";
    return;
  }

  const nombrePromo = selected.value;
  const precio = parseFloat(selected.getAttribute("data-precio"));

  const li = document.createElement("li");
  li.className = "linea-carrito-item";
  li.setAttribute("data-nombre", nombrePromo + " (Promoción)");
  li.setAttribute("data-cantidad", 1);
  li.setAttribute("data-precio", precio.toFixed(2));

  const span = document.createElement("span");
  span.textContent = `${nombrePromo} — ${precio.toFixed(2)} €`;

  const btnEliminar = document.createElement("button");
  btnEliminar.className = "btn-eliminar-carrito";
  btnEliminar.innerHTML = `<img src="img/eliminarcarrito.jpg" alt="Eliminar">`;

  btnEliminar.addEventListener("click", () => {
    li.remove();
    total -= precio;
    totalEl.textContent = total.toFixed(2);
  });

  li.appendChild(span);
  li.appendChild(btnEliminar);
  carrito.appendChild(li);

  total += precio;
  totalEl.textContent = total.toFixed(2);

  errorEl.textContent = "";
  errorEl.className = "";
  select.value = "";
  actualizarPrecioPromo();
}

// Calcular cambio y limpiar campo pago
function calcularCambio() {
  const pagoInput = document.getElementById("pago");
  const totalEl = document.getElementById("total");
  const cambioEl = document.getElementById("cambio");

  if (!pagoInput || !totalEl || !cambioEl) return false; // 👈 devuelve false si no hay elementos

  const pago = parseFloat(pagoInput.value);
  const totalActual = parseFloat(totalEl.textContent);

  if (isNaN(pago) || pago < totalActual) {
    cambioEl.textContent = "El pago debe ser mayor o igual al total.";
    cambioEl.className = "error";

    // ocultar después de 5 segundos
    setTimeout(() => {
      cambioEl.textContent = "";
      cambioEl.className = "";
    }, 5000);

    return false; // 👈 detenemos aquí, indica error
  }

  const cambio = pago - totalActual;
  cambioEl.textContent = `Cambio: ${cambio.toFixed(2)} €`;
  cambioEl.className = "ok";

  // ocultar después de 5 segundos
  setTimeout(() => {
    cambioEl.textContent = "";
    cambioEl.className = "";
  }, 5000);

  pagoInput.value = "";
  return true; // 👈 indica que todo fue correcto
}


/* ===========================
   PRODUCTOS (AGREGAR)
=========================== */

// Limpiar mensajes de producto
function limpiarMensajesProducto() {
  const mensaje = document.getElementById("mensajeProducto");
  const sugerencias = document.getElementById("sugerenciasProducto");
  if (mensaje) { mensaje.textContent = ""; mensaje.className = ""; }
  if (sugerencias) { sugerencias.textContent = ""; sugerencias.className = ""; }
}

// Obtener lista de productos
function getInventarioItems() {
  const lista = document.getElementById("listaProductos");
  if (!lista) return [];
  const items = [];
  lista.querySelectorAll("li").forEach(li => {
    const spanTexto = li.querySelector(".producto-texto");
    if (!spanTexto) return;
    const texto = spanTexto.textContent || "";
    const [nombreParte, precioParte] = texto.split(" - ");
    const nombre = (nombreParte || "").trim();
    const precio = parseFloat((precioParte || "").replace("€", "").trim()) || 0;
    items.push({ nombre, precio, li, spanTexto });
  });
  return items;
}

// Mostrar sugerencias de coincidencias
function mostrarSugerenciasCoincidencias(nombreNuevo) {
  const sugerencias = document.getElementById("sugerenciasProducto");
  if (!sugerencias) return;
  const items = getInventarioItems();

  const coincidencias = items.filter(item =>
    item.nombre.toLowerCase() === (nombreNuevo || "").toLowerCase()
  );

  if (coincidencias.length === 0) {
    sugerencias.textContent = "";
    sugerencias.className = "";
    return;
  }

  const listaHtml = coincidencias
    .map(c => `• ${c.nombre} — ${c.precio.toFixed(2)} €`)
    .join("<br>");

  sugerencias.innerHTML = listaHtml;
  sugerencias.className = "sugerencias";

  setTimeout(() => {
    sugerencias.textContent = "";
    sugerencias.className = "";
  }, 5000);
}

// Crear item en inventario
function crearItemInventario(nombre, precio) {
  const lista = document.getElementById("listaProductos");
  if (!lista) return;

  const li = document.createElement("li");

  const spanTexto = document.createElement("span");
  spanTexto.className = "producto-texto";
  spanTexto.textContent = `${nombre} - ${precio.toFixed(2)} €`;
  li.appendChild(spanTexto);

  const acciones = document.createElement("div");
  acciones.className = "acciones-producto";

  const btnEditar   = crearBoton("img/editar.jpg", "Editar");   // 👉 usa función compartida
  const btnEliminar = crearBoton("img/eliminar.jpg", "Eliminar"); // 👉 usa función compartida

  acciones.appendChild(btnEditar);
  acciones.appendChild(btnEliminar);
  li.appendChild(acciones);

  // Eliminar
  btnEliminar.addEventListener("click", async () => {
    lista.removeChild(li);
    ordenarInventarioPorNombre();
    actualizarSelectVenta(); // sincroniza el select al eliminar

    // 👉 Eliminar también en Google Sheets
    const resultado = await escribirEnHoja("Añadir_Productos", [nombre], "eliminar"); 
    if (!resultado.ok) {
      mostrarMensaje(document.getElementById("mensajeProducto"), "⚠️ No se pudo eliminar en Google Sheets.", "error");
    }
  });

  // Editar
  btnEditar.addEventListener("click", () => {
    const inputPrecio = document.createElement("input");
    inputPrecio.type = "number";
    inputPrecio.step = "0.01";
    inputPrecio.min = "0";
    inputPrecio.value = precio.toFixed(2);

    const accionesEdicion = document.createElement("div");
    accionesEdicion.className = "acciones-producto";

    const btnGuardar  = crearBoton("img/guardar.jpg", "Guardar");
    const btnCancelar = crearBoton("img/cancelar.jpg", "Cancelar");

    accionesEdicion.appendChild(btnGuardar);
    accionesEdicion.appendChild(btnCancelar);

    li.innerHTML = "";
    const nombreFijo = document.createElement("strong");
    nombreFijo.textContent = `${nombre} - `;
    li.appendChild(nombreFijo);
    li.appendChild(inputPrecio);
    li.appendChild(accionesEdicion);

    btnGuardar.addEventListener("click", async () => {
      const nuevoPrecio = parseFloat(inputPrecio.value);
      const mensaje = document.getElementById("mensajeProducto");
      if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
        mostrarMensaje(mensaje, "Precio inválido. Introduce un valor mayor que 0.", "error");
        return;
      }
      precio = nuevoPrecio;
      spanTexto.textContent = `${nombre} - ${precio.toFixed(2)} €`;
      li.innerHTML = "";
      li.appendChild(spanTexto);
      li.appendChild(acciones);
      mostrarMensaje(mensaje, "Producto actualizado correctamente.", "ok");
      ordenarInventarioPorNombre();
      actualizarSelectVenta(); // sincroniza el select al editar

      // 👉 Actualizar también en Google Sheets
      const resultado = await escribirEnHoja("Añadir_Productos", [nombre, nuevoPrecio], "editar");
      if (!resultado.ok) {
        mostrarMensaje(mensaje, "⚠️ No se pudo actualizar en Google Sheets.", "error");
      }

    });

    btnCancelar.addEventListener("click", () => {
      li.innerHTML = "";
      li.appendChild(spanTexto);
      li.appendChild(acciones);
    });
  });

  lista.appendChild(li);
}


// Añadir producto al inventario
async function añadirProductoInventario() {
  const nombreInput = document.getElementById("nombreProducto");
  const precioInput = document.getElementById("precioProductoNuevo");
  const mensaje = document.getElementById("mensajeProducto");

  if (!nombreInput || !precioInput || !mensaje) return;

  const nombre = (nombreInput.value || "").trim();
  let precioStr = (precioInput.value || "").trim();

  // Convertir coma en punto y limitar a 2 decimales
  precioStr = precioStr.replace(",", ".");
  if (precioStr.includes(".")) {
    const [entero, dec = ""] = precioStr.split(".");
    precioStr = entero + "." + dec.slice(0, 2);
  }
  const precio = parseFloat(precioStr);

  limpiarMensajesProducto();

  const soloLetras = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!soloLetras.test(nombre)) {
    mostrarMensaje(mensaje, "El nombre solo puede contener letras.", "error");
    limpiarCampos(nombreInput, precioInput); // 👉 usa función compartida
    nombreInput.focus();
    return;
  }

  if (!nombre || isNaN(precio) || precio <= 0) {
    mostrarMensaje(mensaje, "Completa nombre y precio válido (mayor que 0).", "error");
    mostrarSugerenciasCoincidencias(nombre);
    limpiarCampos(nombreInput, precioInput); // 👉 usa función compartida
    nombreInput.focus();
    return;
  }

  const items = getInventarioItems();
  const existe = items.some(item => item.nombre.toLowerCase() === nombre.toLowerCase());

  if (existe) {
    mostrarMensaje(mensaje, "Ya existe un producto con ese nombre.", "error");
    mostrarSugerenciasCoincidencias(nombre);
    limpiarCampos(nombreInput, precioInput); // 👉 usa función compartida
    nombreInput.focus();
    return;
  }

  // 👉 Añadir en la interfaz
  crearItemInventario(nombre, precio);
  ordenarInventarioPorNombre();
  actualizarSelectVenta();

  mostrarMensaje(mensaje, "Producto añadido correctamente.", "ok");

  // 👉 Guardar también en Google Sheets
  const resultado = await escribirEnHoja("Añadir_Productos", [nombre, precio], "añadir");
  if (!resultado.ok) {
    mostrarMensaje(mensaje, "⚠️ No se pudo guardar en Google Sheets: " + (resultado.error || ""), "error");
  }

  limpiarCampos(nombreInput, precioInput); // 👉 usa función compartida
  mostrarSugerenciasCoincidencias("");
  nombreInput.focus();
}


// Ordenar inventario por nombre
function ordenarInventarioPorNombre() {
  const lista = document.getElementById("listaProductos");
  if (!lista) return;

  const items = Array.from(lista.querySelectorAll("li"));
  items.sort((a, b) => {
    const nombreA = a.querySelector(".producto-texto")?.textContent?.toLowerCase() || "";
    const nombreB = b.querySelector(".producto-texto")?.textContent?.toLowerCase() || "";
    return nombreA.localeCompare(nombreB);
  });

  lista.innerHTML = "";
  items.forEach(item => lista.appendChild(item));
}

// Actualizar select de venta con productos
function actualizarSelectVenta() {
  const selectVenta = document.getElementById("producto");
  const items = getInventarioItems();

  if (!selectVenta) return;

  // Limpia todas las opciones actuales
  selectVenta.innerHTML = "";

  // Opción inicial
  const opcionInicial = document.createElement("option");
  opcionInicial.value = "";
  opcionInicial.disabled = true;
  opcionInicial.selected = true;
  opcionInicial.textContent = "-- Selecciona un producto --";
  selectVenta.appendChild(opcionInicial);

  // Añade cada producto del inventario
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item.nombre; // solo el nombre
    option.textContent = `${item.nombre} — ${item.precio.toFixed(2)} €`;
    option.setAttribute("data-precio", item.precio.toFixed(2)); // 👈 precio separado
    selectVenta.appendChild(option);
  });
}

function actualizarSelectPromocion() {
  const selectVenta = document.getElementById("promocionVenta");
  const listaPromos = document.getElementById("listaPromociones");

  if (!selectVenta || !listaPromos) return;

  // Limpia todas las opciones actuales
  selectVenta.innerHTML = "";

  // Opción inicial
  const opcionInicial = document.createElement("option");
  opcionInicial.value = "";
  opcionInicial.disabled = true;
  opcionInicial.selected = true;
  opcionInicial.textContent = "-- Selecciona una promoción --";
  selectVenta.appendChild(opcionInicial);

  // Añade cada promoción del inventario
  listaPromos.querySelectorAll("li").forEach(li => {
    const nombreEl = li.querySelector(".promo-nombre");
    const precioEl = li.querySelector(".promo-precio");

    if (!nombreEl || !precioEl) return;

    const nombre = nombreEl.textContent.replace("—", "").trim();
    const precio = parseFloat(precioEl.textContent.replace("€", "").trim());

    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = `${nombre} — ${precio.toFixed(2)} €`;
    option.setAttribute("data-precio", precio.toFixed(2));
    selectVenta.appendChild(option);
  });
}


/* ===========================
   PROMOCIÓN (AGREGAR)
=========================== */
function añadirPromocionInventario() {
  const nombreInput = document.getElementById("nombrePromocion");
  const precioInput = document.getElementById("precioPromocionNuevo");
  const mensaje = document.getElementById("mensajePromocion");
  const lista = document.getElementById("listaPromociones");
  const selectVenta = document.getElementById("promocionVenta"); // desplegable cafetería

  const nombre = (nombreInput.value || "").trim();
  let precioStr = (precioInput.value || "").trim().replace(",", ".");
  const precio = parseFloat(precioStr);

  if (!nombre || isNaN(precio) || precio <= 0) {
    mostrarMensaje(mensaje, "Completa nombre y precio válido.", "error");
    return;
  }

  // Crear elemento li en inventario
  const li = document.createElement("li");
  renderPromocion(li, nombre, precio, selectVenta);
  lista.appendChild(li);

  // Crear opción dinámica en el select de cafetería
  const option = document.createElement("option");
  option.value = nombre;
  option.textContent = `${nombre} — ${precio.toFixed(2)} €`;
  option.setAttribute("data-precio", precio.toFixed(2));
  selectVenta.appendChild(option);

  mostrarMensaje(mensaje, "Promoción añadida correctamente.", "ok");

  nombreInput.value = "";
  precioInput.value = "";
}

function renderPromocion(li, nombre, precio, selectVenta) {
  li.innerHTML = `
    <div class="promo-edicion">
      <span class="promo-nombre">${nombre} —</span>
      <span class="promo-precio">${precio.toFixed(2)} €</span>
    </div>
    <div class="botones-promocion">
      <button class="btn-icon btn-editar-promo" title="Editar"><span class="icon"></span></button>
      <button class="btn-icon btn-eliminar-promo" title="Eliminar"><span class="icon"></span></button>
    </div>
  `;

  // Editar
  li.querySelector(".btn-editar-promo").addEventListener("click", () => {
    li.innerHTML = `
      <div class="promo-edicion">
        <span class="promo-nombre">${nombre} —</span>
        <input type="number" step="0.01" class="edit-precio" value="${precio.toFixed(2)}">
      </div>
      <div class="botones-promocion">
        <button class="btn-icon btn-guardar-promo" title="Guardar"><span class="icon"></span></button>
        <button class="btn-icon btn-cancelar-promo" title="Cancelar"><span class="icon"></span></button>
      </div>
    `;

    // Guardar
    li.querySelector(".btn-guardar-promo").addEventListener("click", () => {
      const nuevoPrecio = parseFloat(li.querySelector(".edit-precio").value.replace(",", "."));
      if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
        mostrarMensaje(document.getElementById("mensajePromocion"), "Introduce un precio válido.", "error");
        return;
      }
      renderPromocion(li, nombre, nuevoPrecio, selectVenta);

      // Actualizar opción en el select cafetería
      const option = [...selectVenta.options].find(opt => opt.value === nombre);
      if (option) {
        option.textContent = `${nombre} — ${nuevoPrecio.toFixed(2)} €`;
        option.setAttribute("data-precio", nuevoPrecio.toFixed(2)); // 👈 actualiza el atributo
      }

      mostrarMensaje(document.getElementById("mensajePromocion"), "Precio actualizado.", "ok");
    });

    // Cancelar
    li.querySelector(".btn-cancelar-promo").addEventListener("click", () => {
      renderPromocion(li, nombre, precio, selectVenta);
      mostrarMensaje(document.getElementById("mensajePromocion"), "Edición cancelada.", "ok");
    });
  });

  // Eliminar
  li.querySelector(".btn-eliminar-promo").addEventListener("click", () => {
    li.remove();
    // Eliminar también del select cafetería
    const option = [...selectVenta.options].find(opt => opt.value === nombre);
    if (option) option.remove();

    mostrarMensaje(document.getElementById("mensajePromocion"), "Promoción eliminada.", "ok");
  });
}

/* ===========================
   VENTAS ANTERIORES
=========================== */
let ventasAnteriores = [];

function registrarVenta(items, total) {
  const fecha = new Date().toLocaleDateString("es-ES");
  ventasAnteriores.push({ fecha, items, total });
  mostrarVentas();
}

function mostrarVentas() {
  const lista = document.getElementById("listaVentas");
  lista.innerHTML = "";
  ventasAnteriores.forEach((v, index) => {
    // calcular cantidad total
    const cantidadTotal = v.items.reduce((acc, it) => acc + it.cantidad, 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.fecha}</td>
      <td>Productos</td>
      <td>${cantidadTotal}</td>
      <td>${v.total.toFixed(2)} €</td>
      <td>
        <button class="btn-ver" onclick="verDetalleVenta(${index})">
          <img src="img/verventasanteriores.jpg" alt="Ver detalle">
        </button>
      </td>
    `;
    lista.appendChild(tr);
  });
}

function verDetalleVenta(index) {
  const v = ventasAnteriores[index];
  let detalleHTML = `<p><strong>Fecha:</strong> ${v.fecha}</p>`;
  detalleHTML += `<p><strong>Total productos:</strong> ${v.items.reduce((acc,it)=>acc+it.cantidad,0)}</p>`;
  detalleHTML += `<p><strong>Total (€):</strong> ${v.total.toFixed(2)}</p>`;
  detalleHTML += `<h3>Productos vendidos:</h3><ul>`;
  v.items.forEach(p => {
    detalleHTML += `<li>${p.nombre} - ${p.cantidad} x ${p.precio}€</li>`;
  });
  detalleHTML += `</ul>`;
  document.getElementById("detalleVenta").innerHTML = detalleHTML;
  document.getElementById("modalDetalle").style.display = "block";
}

/* ===========================
   FUNCIONES AUXILIARES CARRITO
=========================== */
function obtenerItemsCarrito() {
  const items = [];
  document.querySelectorAll("#carrito li").forEach(li => {
    const nombre = li.getAttribute("data-nombre") || li.textContent.split(" ")[0];
    const cantidad = parseInt(li.getAttribute("data-cantidad")) || 1;
    const precio = parseFloat(li.getAttribute("data-precio")) || 0;
    items.push({ nombre, cantidad, precio });
  });
  return items;
}

function calcularTotalCarrito() {
  let total = 0;
  document.querySelectorAll("#carrito li").forEach(li => {
    const cantidad = parseInt(li.getAttribute("data-cantidad")) || 1;
    const precio = parseFloat(li.getAttribute("data-precio")) || 0;
    total += cantidad * precio;
  });
  return total;
}

/* ===========================
   INICIALIZACIÓN
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  // Estado inicial: mostramos el login
  mostrarSeccion("login");

  // LOGIN
  const formLogin = document.getElementById("formLogin");
  if (formLogin) {
    formLogin.addEventListener("submit", e => {
      e.preventDefault();
      validarLogin();
    });
  }

 // Escuchar botones del menú principal y de la página de opciones
  document.querySelectorAll("#menu button, #opciones button").forEach(btn => {
    btn.addEventListener("click", () => {
      const destino = btn.getAttribute("data-seccion");
      const mapa = { 
        venta: "cafeteria", 
        productos: "productos", 
        promocion: "promocion",
        ventasAnteriores: "ventasAnteriores",
        opciones: "opciones",
        cierreCaja: "cierreCaja",
        listadoClientes: "listadoClientes",
        cierresAnteriores: "cierresAnteriores"
      };
      mostrarSeccion(mapa[destino] || destino);
    });
  });


  // Botones "Volver al menú"
document.querySelectorAll(".btnVolver").forEach(b => {
  b.addEventListener("click", () => {
    limpiarCamposCierreCaja();
    mostrarSeccion("menu");
    // limpiar campos y estados de la cafetería
    const producto = document.getElementById("producto");
    const cantidad = document.getElementById("cantidad");
    const precioProducto = document.getElementById("precioProducto");
    const productoError = document.getElementById("productoError");
    const promoCheck = document.getElementById("promoCheck");
    const promoBox = document.getElementById("promoBox");
    const promocion = document.getElementById("promocionVenta");
    const precioPromo = document.getElementById("precioPromo");
    const promoError = document.getElementById("promoError");
    const carrito = document.getElementById("carrito");
    const totalEl = document.getElementById("total");
    const pago = document.getElementById("pago");
    const cambio = document.getElementById("cambio");
    const fechaFiltro = document.getElementById("fechaFiltro");
    const listaVentas = document.getElementById("listaVentas"); // 👈 nuevo

    if (fechaFiltro) fechaFiltro.value = "";
    if (producto) producto.value = "";
    if (cantidad) cantidad.value = "";
    if (precioProducto) precioProducto.textContent = "0.00 €";
    if (productoError) { productoError.textContent = ""; productoError.className = ""; }

    if (promoCheck) promoCheck.checked = false;
    if (promoBox) promoBox.style.display = "none";
    if (promocion) promocion.value = "";
    if (precioPromo) precioPromo.textContent = "0.00 €";
    if (promoError) { promoError.textContent = ""; promoError.className = ""; }

    if (carrito) carrito.innerHTML = "";
    if (totalEl) totalEl.textContent = "0";
    total = 0;

    if (pago) pago.value = "";
    if (cambio) { cambio.textContent = ""; cambio.className = ""; }

    // ✅ limpiar tabla de ventas y volver a mostrar todas
    if (listaVentas) {
      listaVentas.innerHTML = "";
      ventasAnteriores.forEach((v, index) => {
        const cantidadTotal = v.items.reduce((acc, it) => acc + it.cantidad, 0);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${v.fecha}</td>
          <td>Productos</td>
          <td>${cantidadTotal}</td>
          <td>${v.total.toFixed(2)} €</td>
          <td>
            <button class="btn-ver" onclick="verDetalleVenta(${index})">
              <img src="img/verventasanteriores.jpg" alt="Ver detalle">
            </button>
          </td>
        `;
        listaVentas.appendChild(tr);
      });
    }
  });
});

  // VENTAS — eventos
  const selectProducto = document.getElementById("producto");
  if (selectProducto) selectProducto.addEventListener("change", actualizarPrecioProducto);
  
  const selectPromo = document.getElementById("promocionVenta");
  if (selectPromo) selectPromo.addEventListener("change", actualizarPrecioPromo);
  
  const btnAñadir = document.getElementById("btnAñadir");
  if (btnAñadir) btnAñadir.addEventListener("click", añadirProducto);

  const promoCheck = document.getElementById("promoCheck");
  const promoBox = document.getElementById("promoBox");
  if (promoCheck && promoBox) {
    promoCheck.addEventListener("change", e => {
      promoBox.style.display = e.target.checked ? "block" : "none";
    });
  }

  const btnPromo = document.getElementById("btnPromo");
  if (btnPromo) btnPromo.addEventListener("click", añadirPromocion);

const btnCambio = document.getElementById("btnCambio");
if (btnCambio) {
  btnCambio.addEventListener("click", () => {
  const pagoEl = document.getElementById("pago");
  const cambioEl = document.getElementById("cambio");
  const carrito = document.getElementById("carrito");
  const totalEl = document.getElementById("total");
  const mensajeVenta = document.getElementById("mensajeVenta");

  // ✅ Validar y calcular cambio
  const cambioCorrecto = calcularCambio();
  if (!cambioCorrecto) return; // 👈 si hubo error, detenemos aquí

  // recoger los datos del carrito
  const items = obtenerItemsCarrito();
  const totalVenta = calcularTotalCarrito();

  // registrar la venta en Ventas Anteriores
  registrarVenta(items, totalVenta);

  // ✅ mostrar mensaje de venta realizada
  if (mensajeVenta) {
    mensajeVenta.textContent = "Venta realizada correctamente.";
    mensajeVenta.className = "ok";
    mensajeVenta.style.display = "block";

    setTimeout(() => {
      mensajeVenta.style.display = "none";
    }, 3000);
  }

  // ✅ limpiar carrito y valores después de registrar
  if (carrito) carrito.innerHTML = "";
  if (totalEl) totalEl.textContent = "0";
  total = 0;
  if (pagoEl) pagoEl.value = "";

    // ✅ limpiar y ocultar promoción
    const promoCheck = document.getElementById("promoCheck");
    const promoBox = document.getElementById("promoBox");
    const promocion = document.getElementById("promocionVenta");
    const precioPromo = document.getElementById("precioPromo");
    const promoError = document.getElementById("promoError");

    if (promoCheck) promoCheck.checked = false;
    if (promoBox) promoBox.style.display = "none";
    if (promocion) promocion.value = "";
    if (precioPromo) precioPromo.textContent = "0.00 €";
    if (promoError) { promoError.textContent = ""; promoError.className = ""; }

    // ✅ limpiar producto y errores
    const producto = document.getElementById("producto");
    const cantidad = document.getElementById("cantidad");
    const precioProducto = document.getElementById("precioProducto");
    const productoError = document.getElementById("productoError");

    if (producto) producto.value = "";
    if (cantidad) cantidad.value = "";
    if (precioProducto) precioProducto.textContent = "0.00 €";
    if (productoError) { productoError.textContent = ""; productoError.className = ""; }
  });
}

  // ✅ NUEVO: cerrar modal con imagen cerrarmodal.jpg
  const btnCerrarModal = document.querySelector("#modalDetalle .cerrar");
  if (btnCerrarModal) {
    btnCerrarModal.addEventListener("click", () => {
      document.getElementById("modalDetalle").style.display = "none";
    });
  }

  // ✅ NUEVO: botón descargar Excel en el modal
  const btnDescargarExcel = document.getElementById("btnDescargarExcel");
  if (btnDescargarExcel) {
    btnDescargarExcel.addEventListener("click", () => {
      const v = ventasAnteriores[ventasAnteriores.length - 1];
      if (!v) return;

      // Construir datos para Excel
      const datos = [
        ["Fecha", v.fecha],
        ["Total productos", v.items.reduce((acc,it)=>acc+it.cantidad,0)],
        ["Total (€)", v.total.toFixed(2)],
        [],
        ["Productos vendidos:"],
        ["Nombre", "Cantidad", "Precio unitario (€)", "Subtotal (€)"]
      ];

      v.items.forEach(p => {
        const subtotal = p.cantidad * p.precio;
        datos.push([p.nombre, p.cantidad, p.precio, subtotal.toFixed(2)]);
      });

      // Crear hoja y libro con SheetJS
      const ws = XLSX.utils.aoa_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Venta");

      // Nombre de archivo por fecha
      const nombreArchivo = `Venta_${v.fecha.replace(/\//g,"-")}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);
    });
  }

  // PRODUCTOS — prevenir envío y conectar botón
  const formProductos = document.getElementById("formProductos");
  if (formProductos) formProductos.addEventListener("submit", e => e.preventDefault());
  const btnAddProducto = document.getElementById("btnAddProducto");
  if (btnAddProducto) btnAddProducto.addEventListener("click", añadirProductoInventario);

  // PROMOCIONES — prevenir envío y conectar botón
  const formPromociones = document.getElementById("formPromociones");
  if (formPromociones) formPromociones.addEventListener("submit", e => e.preventDefault());
  const btnAddPromocion = document.getElementById("btnAddPromocion");
  if (btnAddPromocion) btnAddPromocion.addEventListener("click", añadirPromocionInventario);

// FILTRAR VENTAS POR FECHA
const btnFiltrarVentas = document.getElementById("btnFiltrarVentas");
if (btnFiltrarVentas) {
  btnFiltrarVentas.addEventListener("click", () => {
    const fechaFiltroRaw = document.getElementById("fechaFiltro").value;
    if (!fechaFiltroRaw) return;

    // convertir YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fechaFiltroRaw.split("-");
    const fechaFiltro = `${day}/${month}/${year}`;

    const lista = document.getElementById("listaVentas");
    lista.innerHTML = ""; // limpiar tabla

    // buscar coincidencias por fecha formateada
    const ventasFiltradas = ventasAnteriores.filter(v => v.fecha === fechaFiltro);

    if (ventasFiltradas.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="5" style="color:red; font-weight:bold;">
          Este día no hubo ventas
        </td>
      `;
      lista.appendChild(tr);
    } else {
      ventasFiltradas.forEach(v => {
        const indexOriginal = ventasAnteriores.indexOf(v); // índice correcto en el array global
        const cantidadTotal = v.items.reduce((acc, it) => acc + it.cantidad, 0);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${v.fecha}</td>
          <td>Productos</td>
          <td>${cantidadTotal}</td>
          <td>${v.total.toFixed(2)} €</td>
          <td>
            <button class="btn-ver" onclick="verDetalleVenta(${indexOriginal})">
              <img src="img/verventasanteriores.jpg" alt="Ver detalle">
            </button>
          </td>
        `;
        lista.appendChild(tr);
      });
    }
  });


}
// Validaciones compartidas
  configurarValidacionPrecio(document.getElementById("precioProductoNuevo"));
  configurarValidacionPrecio(document.getElementById("precioPromocionNuevo"));

  // Sincronizar selects
  actualizarSelectVenta();
  actualizarSelectPromocion();
});

/* ===========================
   CIERRE DE CAJA
=========================== */
let cierresCaja = []; // array para guardar cierres por fecha

// Mostrar la pantalla de cierre de caja con fecha y total del día
function mostrarCierreCaja() {
  const fechaHoy = new Date().toLocaleDateString("es-ES");
  const totalDia = ventasAnteriores
    .filter(v => v.fecha === fechaHoy)
    .reduce((acc, v) => acc + v.total, 0);

  document.getElementById("fechaCierre").textContent = fechaHoy;
  document.getElementById("totalDia").textContent = totalDia.toFixed(2);
  mostrarSeccion("cierreCaja");
}

document.getElementById("btnCierreCaja")?.addEventListener("click", mostrarCierreCaja);

// Función para mostrar ventana flotante
function mostrarMensajeFlotante(texto) {
  const modal = document.getElementById("mensajeFlotante");
  const textoEl = document.getElementById("textoFlotante");
  textoEl.textContent = texto;
  modal.style.display = "flex";
}

// Cerrar ventana flotante al pulsar aceptar
document.getElementById("btnAceptarFlotante")?.addEventListener("click", () => {
  document.getElementById("mensajeFlotante").style.display = "none";
});

// Comprobar si se ha hecho cierre hoy
function comprobarCierreHoy() {
  const fechaHoy = new Date().toLocaleDateString("es-ES");
  const ventasHoy = ventasAnteriores.filter(v => v.fecha === fechaHoy);
  const cierreHoy = cierresCaja.find(c => c.fecha === fechaHoy);

  if (ventasHoy.length > 0 && !cierreHoy) {
    alert("⚠️ Hubo ventas hoy pero no se ha realizado el cierre de caja.");
    // Aquí podrías integrar envío de correo con backend/servidor
  }
}

/* ===========================
   TOTAL EFECTIVO CONTADO
=========================== */
function calcularTotalEfectivo() {
  // Monedas
  const moneda05 = (parseInt(document.getElementById("moneda05").value) || 0) * 0.05;
  const moneda10 = (parseInt(document.getElementById("moneda10").value) || 0) * 0.10;
  const moneda20 = (parseInt(document.getElementById("moneda20").value) || 0) * 0.20;
  const moneda50 = (parseInt(document.getElementById("moneda50").value) || 0) * 0.50;
  const moneda1  = (parseInt(document.getElementById("moneda1").value)  || 0) * 1;
  const moneda2  = (parseInt(document.getElementById("moneda2").value)  || 0) * 2;

  // Billetes
  const billete5  = (parseInt(document.getElementById("billete5").value)  || 0) * 5;
  const billete10 = (parseInt(document.getElementById("billete10").value) || 0) * 10;
  const billete20 = (parseInt(document.getElementById("billete20").value) || 0) * 20;

  // Suma total
  const total = moneda05 + moneda10 + moneda20 + moneda50 + moneda1 + moneda2 +
                billete5 + billete10 + billete20;

  // Mostrar resultado
  document.getElementById("totalEfectivo").textContent = total.toFixed(2) + " €";
}

// Escuchar cambios en todos los inputs de monedas y billetes
["moneda05","moneda10","moneda20","moneda50","moneda1","moneda2",
 "billete5","billete10","billete20"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", calcularTotalEfectivo);
});

/* ===========================
   LIMPIAR CAMPOS CIERRE CAJA
=========================== */
function limpiarCamposCierreCaja() {
  ["dineroCaja","bizumCaja","pendienteCaja","importeDejar",
   "moneda05","moneda10","moneda20","moneda50","moneda1","moneda2",
   "billete5","billete10","billete20"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const totalEl = document.getElementById("totalEfectivo");
  if (totalEl) totalEl.textContent = "0 €";
}
/* ===========================
   LISTADO DE CLIENTES
=========================== */
(() => {
  if (window.__clientesInit) return;
  window.__clientesInit = true;

  document.addEventListener("DOMContentLoaded", () => {
    const btnAgregar = document.getElementById("btnAgregarCliente");
    const nombreInput = document.getElementById("nombreCliente");
    const cantidadInput = document.getElementById("cantidadPendiente");
    const tbody = document.querySelector("#tablaClientes tbody");

    const btnVolver = document.getElementById("btnVolver");
    const listadoClientes = document.getElementById("listadoClientes");
    const opciones = document.getElementById("opciones");

    if (!btnAgregar || !nombreInput || !cantidadInput || !tbody) return;

    let clientesPendientes = [];

    // Bloquear números en el input de nombre
    nombreInput.addEventListener("keypress", (e) => {
      const char = String.fromCharCode(e.which || e.keyCode);
      if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]$/.test(char)) {
        e.preventDefault();
      }
    });

    // Función para mostrar mensajes flotantes (toast)
    function showToast(text, type = "error") {
      const toastContainer = document.getElementById("toast");
      if (!toastContainer) return;

      const msg = document.createElement("div");
      msg.className = `toast-message ${type}`;
      msg.textContent = text;
      toastContainer.appendChild(msg);

      setTimeout(() => {
        msg.remove();
      }, 3500);
    }

    // Evento botón agregar cliente
    btnAgregar.addEventListener("click", (e) => {
      e.preventDefault();

      const nombre = nombreInput.value.trim();
      const cantidadStr = cantidadInput.value.trim();

      if (nombre === "" || cantidadStr === "") {
        showToast("⚠️ Debes rellenar todos los campos", "error");
        return;
      }

      const cantidad = parseFloat(cantidadStr);
      if (isNaN(cantidad) || cantidad <= 0) {
        showToast("⚠️ La cantidad debe ser un número mayor que 0", "error");
        return;
      }

      // Verificar duplicados
      const existe = clientesPendientes.some(
        (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
      );
      if (existe) {
        showToast(`⚠️ El cliente "${nombre}" ya está añadido`, "error");
        return;
      }

      clientesPendientes.push({ nombre, cantidad });
      actualizarTablaClientes();

      showToast("✅ Cliente agregado correctamente", "success");

      nombreInput.value = "";
      cantidadInput.value = "";
    });

function actualizarTablaClientes() {
  tbody.innerHTML = "";

  // Ordenar de mayor a menor deuda
  const ordenados = [...clientesPendientes].sort((a, b) => b.cantidad - a.cantidad);

  ordenados.forEach((cliente) => {
    const tr = document.createElement("tr");

    const tdNombre = document.createElement("td");
    tdNombre.innerHTML = `<strong>${cliente.nombre}</strong>`;

    const tdCantidad = document.createElement("td");
    tdCantidad.innerHTML = `<strong>${cliente.cantidad.toFixed(2)} €</strong>`;

    const tdAcciones = document.createElement("td");

    // índice real en clientesPendientes
    const realIndex = clientesPendientes.findIndex(
      (c) => c.nombre.toLowerCase() === cliente.nombre.toLowerCase()
    );

    const btnEliminar = document.createElement("img");
    btnEliminar.src = "img/eliminarcliente.jpg";
    btnEliminar.alt = "Eliminar";
    btnEliminar.className = "icono-accion";
    btnEliminar.addEventListener("click", () => eliminarCliente(realIndex));

    const btnEditar = document.createElement("img");
    btnEditar.src = "img/editarcliente.jpg";
    btnEditar.alt = "Editar";
    btnEditar.className = "icono-accion";
    btnEditar.addEventListener("click", () =>
      editarCliente(realIndex, tdCantidad, tdAcciones)
    );

    tdAcciones.appendChild(btnEliminar);
    tdAcciones.appendChild(btnEditar);

    tr.appendChild(tdNombre);
    tr.appendChild(tdCantidad);
    tr.appendChild(tdAcciones);

    // Colorear fila según deuda
    if (cliente.cantidad >= 15) {
      tdNombre.style.color = "red";
      tdCantidad.style.color = "red";
    } else if (cliente.cantidad >= 10) {
      tdNombre.style.color = "orange";
      tdCantidad.style.color = "orange";
    }

    tbody.appendChild(tr);
  });
}

// Eliminar cliente (ya pagó)
function eliminarCliente(index) {
      const cliente = clientesPendientes[index];
      clientesPendientes.splice(index, 1);
      actualizarTablaClientes();
      showToast(`✅ El cliente ${cliente.nombre} ha pagado su deuda`, "success");
}

// Editar cliente inline
function editarCliente(index, tdCantidad, tdAcciones) {
  const actual = clientesPendientes[index].cantidad;

// Input editable con la cantidad actual
  const inputCantidad = document.createElement("input");
  inputCantidad.type = "number";
  inputCantidad.step = "0.01";
  inputCantidad.value = actual.toFixed(2); // 👈 muestra la deuda actual exacta
  inputCantidad.style.width = "80px";

  tdCantidad.innerHTML = "";
  tdCantidad.appendChild(inputCantidad);

  // Ocultar acciones previas
  tdAcciones.innerHTML = "";

  // Botón guardar
  const btnGuardar = document.createElement("img");
  btnGuardar.src = "img/guardarclientes.jpg";
  btnGuardar.alt = "Guardar";
  btnGuardar.className = "icono-accion";
  btnGuardar.addEventListener("click", () => {
    const nuevaCantidad = parseFloat(inputCantidad.value);
    if (!isNaN(nuevaCantidad) && nuevaCantidad >= 0) {
      clientesPendientes[index].cantidad = nuevaCantidad;
      actualizarTablaClientes();
      showToast("✅ Cantidad actualizada", "success");
    } else {
      showToast("⚠️ Cantidad inválida", "error");
    }
  });

  // Botón cancelar
  const btnCancelar = document.createElement("img");
  btnCancelar.src = "img/cancelarclientes.jpg";
  btnCancelar.alt = "Cancelar";
  btnCancelar.className = "icono-accion";
  btnCancelar.addEventListener("click", () => {
    actualizarTablaClientes(); // vuelve al estado normal
  });

  tdAcciones.appendChild(btnGuardar);
  tdAcciones.appendChild(btnCancelar);
}
// Evento botón VOLVER de listado de clientes
if (btnVolver) {
  btnVolver.addEventListener("click", (e) => {
    e.preventDefault();
    listadoClientes.style.display = "none";
    opciones.style.display = "block";
  });
}

// Evento botón VOLVER de cierres anteriores
const btnVolverCierres = document.getElementById("btnVolverCierres");
const cierresAnteriores = document.getElementById("cierresAnteriores");

if (btnVolverCierres) {
  btnVolverCierres.addEventListener("click", (e) => {
    e.preventDefault();
    cierresAnteriores.style.display = "none";
    opciones.style.display = "block";
  });
}

window.eliminarCliente = eliminarCliente;
window.editarCliente = editarCliente;
});
})();

/* ===========================
   MENSAJE FLOTANTE (GLOBAL)
=========================== */
function mostrarMensajeFlotante(texto) {
  const modal = document.getElementById("mensajeFlotante");
  const textoEl = document.getElementById("textoFlotante");
  textoEl.textContent = texto;
  modal.style.display = "flex";
}

document.getElementById("btnAceptarFlotante")?.addEventListener("click", () => {
  document.getElementById("mensajeFlotante").style.display = "none";
});

// Acumulador global de faltante
let faltanteAcumulado = 0;

// Guardar cierre de caja (único bloque)
document.getElementById("btnGuardarCierre")?.addEventListener("click", () => {
  const fechaHoy = new Date().toLocaleDateString("es-ES");
  const totalDia = parseFloat(document.getElementById("totalDia").textContent);

  const cierre = {
    fecha: fechaHoy,
    totalDia,
    dineroCaja: parseFloat(document.getElementById("dineroCaja").value) || 0,
    bizum: parseFloat(document.getElementById("bizumCaja").value) || 0,
    pendiente: parseFloat(document.getElementById("pendienteCaja").value) || 0,
    importeDejar: parseFloat(document.getElementById("importeDejar").value) || 0
  };

  const tbodyCierres = document.querySelector("#tablaCierres tbody");
  let existeFecha = cierresCaja.some(c => c.fecha === fechaHoy);

  if (existeFecha) {
    mostrarMensajeFlotante("⚠️ Ya existe un cierre de caja para la fecha de hoy. Solo se admite un cierre por día.");
    return;
  }

  // acumular pendiente en faltante
  faltanteAcumulado += cierre.pendiente;

  // crear fila
  const tr = document.createElement("tr");

  const tdFecha = document.createElement("td");
  tdFecha.textContent = cierre.fecha;

  const tdFaltante = document.createElement("td");
  tdFaltante.textContent = (faltanteAcumulado > 0 ? "-" : "") + faltanteAcumulado.toFixed(2) + " €";
  tdFaltante.className = (faltanteAcumulado > 0) ? "faltante-negativo" : "faltante-cero";

  const tdRecibido = document.createElement("td");
  tdRecibido.textContent = cierre.dineroCaja.toFixed(2) + " €";

  const tdVendido = document.createElement("td");
  tdVendido.textContent = cierre.totalDia.toFixed(2) + " €";

  const tdTotalCaja = document.createElement("td");
  tdTotalCaja.textContent = (cierre.dineroCaja + cierre.totalDia).toFixed(2) + " €";

  const tdDejado = document.createElement("td");
  tdDejado.textContent = cierre.importeDejar.toFixed(2) + " €";

  tr.appendChild(tdFecha);
  tr.appendChild(tdFaltante);
  tr.appendChild(tdRecibido);
  tr.appendChild(tdVendido);
  tr.appendChild(tdTotalCaja);
  tr.appendChild(tdDejado);

  tbodyCierres.appendChild(tr);

  cierresCaja.push(cierre);

  mostrarMensajeFlotante("✅ Cierre de caja guardado correctamente.");

  limpiarCamposCierreCaja();
  mostrarSeccion("menu");
});
