/**
 * Gestiona un chatbot interactivo con un panel de botones dinámico y un juego de Trivial.
 * Usa el catálogo de libros de Ejemplares.xml y los estilos de index.html.
 */

/**
 * Añade un mensaje al panel de chat con animación.
 * @param {string} texto - Texto del mensaje.
 * @param {string} tipo - Tipo de mensaje ('bot', 'user', 'panel', 'correcto', 'incorrecto').
 */
function agregarMensaje(texto, tipo) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.innerHTML = texto;
    p.style.opacity = '0';
    p.style.transform = 'translateY(10px)';
    p.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    div.appendChild(p);
    requestAnimationFrame(() => {
        p.style.opacity = '1';
        p.style.transform = 'translateY(0)';
        div.scrollTop = div.scrollHeight;
    });
}

/**
 * Genera el HTML para botones estilizados usando variables CSS de index.html.
 * @param {string} texto - Texto del botón.
 * @param {string} onclick - Función onclick del botón.
 * @param {string} ariaLabel - Descripción para accesibilidad.
 * @returns {string} HTML del botón.
 */
function crearBoton(texto, onclick, ariaLabel) {
    return `
        <button onclick="${onclick}" 
                style="background-color: var(--btn-primary); color: white; padding: 8px 12px; border: none; border-radius: 4px; margin: 5px; cursor: pointer; transition: background-color 0.3s;"
                onmouseover="this.style.backgroundColor='var(--btn-hover)'"
                onmouseout="this.style.backgroundColor='var(--btn-primary)'"
                aria-label="${ariaLabel}">
            ${texto}
        </button>
    `;
}

/**
 * Muestra el panel inicial con opciones interactivas.
 */
function iniciarChat() {
    const div = document.getElementById('chatMensajes');
    div.innerHTML = '';
    const mensajeInicial = `
        <strong>📚 ¡Bienvenido a la Biblioteca Hipatia!</strong><br>
        Elige una opción para empezar:<br>
        ${crearBoton('1. Buscar libros 🔍', 'opcionBuscarLibros()', 'Buscar libros por título, autor o categoría')}
        ${crearBoton('2. Reservar libros 📚', 'opcionReservarLibros()', 'Abrir formulario de reserva de libros')}
        ${crearBoton('3. Solicitar libros nuevos 🔖', 'opcionSolicitarLibros()', 'Abrir formulario de solicitud de libros')}
        ${crearBoton('4. Jugar al Trivial 🎲', 'iniciarTrivial()', 'Jugar al Trivial con preguntas sobre libros')}
        ${crearBoton('5. Reiniciar chat 🔄', 'iniciarChat()', 'Reiniciar el chat')}
    `;
    agregarMensaje(mensajeInicial, 'panel');
}

/**
 * Activa el campo de búsqueda existente.
 */
function opcionBuscarLibros() {
    const input = document.getElementById('buscarInput');
    input.focus();
    agregarMensaje('Escribe tu búsqueda en el campo de arriba. Ejemplo: título, autor o categoría. 😊', 'bot');
    agregarMensaje(crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú principal'), 'panel');
}

/**
 * Redirige al formulario de reserva.
 */
function opcionReservarLibros() {
    window.open('// Reemplazar url', '_blank');
    agregarMensaje('Abriendo el formulario de reserva... ¡Prepárate para elegir tu libro! 📚', 'bot');
    agregarMensaje(crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú principal'), 'panel');
}

/**
 * Redirige al formulario de solicitud.
 */
function opcionSolicitarLibros() {
    window.open('// Reemplazar url', '_blank');
    agregarMensaje('Abriendo el formulario de solicitud... ¡Pide tu libro favorito! 🔖', 'bot');
    agregarMensaje(crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú principal'), 'panel');
}

/**
 * Estado del juego de Trivial.
 */
let trivialState = {
    puntuacion: 0,
    respuestasCorrectasSeguidas: 0,
    historial: [],
    preguntaActual: null,
    indicePregunta: 0,
    tiempoInicio: null
};

/**
 * Carga el historial de puntos desde localStorage.
 */
function cargarHistorialPuntos() {
    const historialGuardado = localStorage.getItem('trivialHistorial');
    if (historialGuardado) {
        trivialState.historial = JSON.parse(historialGuardado);
        trivialState.puntuacion = trivialState.historial.reduce((sum, entry) => sum + entry.puntos, 0);
    }
}

/**
 * Guarda una entrada en el historial de puntos.
 * @param {Object} entrada - Detalles de la ronda (pregunta, respuesta, etc.).
 */
function guardarHistorialPuntos(entrada) {
    trivialState.historial.push(entrada);
    trivialState.puntuacion += entrada.puntos;
    localStorage.setItem('trivialHistorial', JSON.stringify(trivialState.historial));
}

/**
 * Genera una pregunta variada para el Trivial.
 * @returns {Object|null} Pregunta con opciones y respuesta correcta.
 */
function generarPreguntaTrivial() {
    if (!window.catalogo || window.catalogo.length < 4) {
        return null;
    }
    const tiposPregunta = [
        {
            tipo: 'autor',
            texto: libro => `¿Quién escribió "${libro.titulo}"?`,
            clave: 'autor'
        },
        {
            tipo: 'categoria',
            texto: libro => `¿A qué categoría pertenece "${libro.titulo}"?`,
            clave: 'categoria'
        },
        {
            tipo: 'titulo',
            texto: libro => `¿Cuál es el título del libro de ${libro.autor}?`,
            clave: 'titulo'
        }
    ];
    const tipoPregunta = tiposPregunta[Math.floor(Math.random() * tiposPregunta.length)];
    const indice = Math.floor(Math.random() * window.catalogo.length);
    const libro = window.catalogo[indice];
    const pregunta = tipoPregunta.texto(libro);
    const respuestaCorrecta = libro[tipoPregunta.clave];
    const opciones = [respuestaCorrecta];
    while (opciones.length < 4) {
        const otroLibro = window.catalogo[Math.floor(Math.random() * window.catalogo.length)];
        const valor = otroLibro[tipoPregunta.clave];
        if (valor !== respuestaCorrecta && !opciones.includes(valor)) {
            opciones.push(valor);
        }
    }
    // Barajar opciones
    for (let i = opciones.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opciones[i], opciones[j]] = [opciones[i], opciones[j]];
    }
    return { pregunta, opciones, respuestaCorrecta, tipo: tipoPregunta.clave, indice };
}

/**
 * Inicia una nueva ronda de Trivial.
 */
function iniciarTrivial() {
    cargarHistorialPuntos();
    trivialState.respuestasCorrectasSeguidas = 0;
    trivialState.indicePregunta++;
    trivialState.preguntaActual = generarPreguntaTrivial();
    trivialState.tiempoInicio = Date.now();
    if (!trivialState.preguntaActual) {
        agregarMensaje('Catálogo no disponible. ¡Intenta de nuevo más tarde! 😔', 'bot');
        agregarMensaje(crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú principal'), 'panel');
        return;
    }
    const { pregunta, opciones } = trivialState.preguntaActual;
    const mensaje = `
        <strong>🎲 Trivial: Pregunta ${trivialState.indicePregunta}</strong><br>
        ${pregunta}<br>
        ${opciones.map((opcion, i) => crearBoton(`${i + 1}. ${opcion}`, `responderTrivial('${opcion}')`, `Responder ${opcion} en el Trivial`)).join('')}
        <br>${crearBoton('Ver historial 📊', 'verHistorialPuntos()', 'Ver historial de puntos')}
        ${crearBoton('Salir del Trivial 🚪', 'iniciarChat()', 'Volver al menú principal')}
    `;
    agregarMensaje(mensaje, 'panel');
}

/**
 * Procesa la respuesta del usuario en el Trivial.
 * @param {string} respuesta - Respuesta seleccionada.
 */
function responderTrivial(respuesta) {
    const { respuestaCorrecta, pregunta, tipo } = trivialState.preguntaActual;
    const tiempoRespuesta = (Date.now() - trivialState.tiempoInicio) / 1000;
    let puntos = 0;
    let mensaje = '';
    let tipoMensaje = 'bot';
    if (respuesta === respuestaCorrecta) {
        trivialState.respuestasCorrectasSeguidas++;
        puntos = 5;
        if (tiempoRespuesta < 10) puntos += 2; // Bonus por rapidez
        if (trivialState.respuestasCorrectasSeguidas >= 3) {
            puntos += 30;
            trivialState.respuestasCorrectasSeguidas = 0;
        }
        mensaje = `¡Correcto! 🎉 +${puntos} puntos (Total: ${trivialState.puntuacion + puntos})`;
        tipoMensaje = 'correcto';
    } else {
        trivialState.respuestasCorrectasSeguidas = 0;
        mensaje = `Incorrecto. 😔 La respuesta correcta era: ${respuestaCorrecta}`;
        tipoMensaje = 'incorrecto';
    }
    guardarHistorialPuntos({
        pregunta,
        tipo,
        respuestaDada: respuesta,
        respuestaCorrecta,
        puntos,
        tiempo: tiempoRespuesta
    });
    agregarMensaje(mensaje, tipoMensaje);
    // Siguiente pregunta
    trivialState.preguntaActual = generarPreguntaTrivial();
    trivialState.tiempoInicio = Date.now();
    trivialState.indicePregunta++;
    if (!trivialState.preguntaActual) {
        agregarMensaje('Catálogo no disponible. ¡Intenta de nuevo más tarde! 😔', 'bot');
        agregarMensaje(crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú principal'), 'panel');
        return;
    }
    const { pregunta: nuevaPregunta, opciones } = trivialState.preguntaActual;
    const mensajeSiguiente = `
        <strong>🎲 Trivial: Pregunta ${trivialState.indicePregunta}</strong><br>
        ${nuevaPregunta}<br>
        ${opciones.map((opcion, i) => crearBoton(`${i + 1}. ${opcion}`, `responderTrivial('${opcion}')`, `Responder ${opcion} en el Trivial`)).join('')}
        <br>${crearBoton('Ver historial 📊', 'verHistorialPuntos()', 'Ver historial de puntos')}
        ${crearBoton('Salir del Trivial 🚪', 'iniciarChat()', 'Volver al menú principal')}
    `;
    agregarMensaje(mensajeSiguiente, 'panel');
}

/**
 * Muestra el historial detallado de puntos.
 */
function verHistorialPuntos() {
    const historial = trivialState.historial.length > 0
        ? trivialState.historial.map((entry, i) => `
            Ronda ${i + 1}: ${entry.pregunta}<br>
            - Tu respuesta: ${entry.respuestaDada}<br>
            - Correcta: ${entry.respuestaCorrecta}<br>
            - Puntos: ${entry.puntos} (Tiempo: ${entry.tiempo.toFixed(1)}s)
        `).join('<br>')
        : 'No hay historial de puntos aún. ¡Juega al Trivial! 🎲';
    const mensaje = `
        <strong>📊 Historial de Puntos</strong><br>
        ${historial}<br>
        Total: ${trivialState.puntuacion} puntos<br>
        ${crearBoton('Volver al Trivial 🎲', 'iniciarTrivial()', 'Continuar jugando al Trivial')}
        ${crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú principal')}
    `;
    agregarMensaje(mensaje, 'panel');
}

/**
 * Estilos adicionales para respuestas correctas/incorrectas.
 */
function agregarEstilosRespuesta() {
    const style = document.createElement('style');
    style.textContent = `
        .mensaje.correcto {
            background-color: var(--btn-reserva);
            color: white;
            padding: 10px;
            border-radius: 4px;
        }
        .mensaje.incorrecto {
            background-color: var(--btn-solicitud);
            color: black;
            padding: 10px;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Inicializa el chat al cargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
    agregarEstilosRespuesta();
    iniciarChat();
});