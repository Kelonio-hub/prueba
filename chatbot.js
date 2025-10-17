/**
 * Chatbot interactivo con procesamiento de texto autónomo para consultas y reservas de libros.
 * Usa catálogo local de Ejemplares.xml y simula reservas en localStorage.
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
 * Genera HTML para botones estilizados.
 * @param {string} texto - Texto del botón.
 * @param {string} onclick - Función onclick.
 * @param {string} ariaLabel - Etiqueta ARIA.
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
 * Muestra el panel inicial con opciones.
 */
function iniciarChat() {
    const div = document.getElementById('chatMensajes');
    div.innerHTML = '';
    const mensajeInicial = `
        <strong>📚 ¡Bienvenido a la Biblioteca Hipatia!</strong><br>
        Escribe tu consulta o elige una opción:<br>
        ${crearBoton('Buscar libros 🔍', 'opcionBuscarLibros()', 'Buscar libros')}
        ${crearBoton('Reservar libros 📚', 'opcionReservarLibros()', 'Reservar libros')}
        ${crearBoton('Solicitar nuevos 🔖', 'opcionSolicitarLibros()', 'Solicitar libros nuevos')}
        ${crearBoton('Jugar Trivial 🎲', 'iniciarTrivial()', 'Jugar al Trivial')}
        ${crearBoton('Reiniciar 🔄', 'iniciarChat()', 'Reiniciar chat')}
    `;
    agregarMensaje(mensajeInicial, 'panel');
    document.getElementById('chatInput').disabled = false;
    document.getElementById('chatInput').focus();
}

/**
 * Procesa el mensaje del usuario y responde autónomamente.
 */
async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim().toLowerCase();
    if (!mensaje) return;
    agregarMensaje(mensaje, 'user');
    input.value = '';
    input.disabled = true;

    try {
        // Cargar catálogo si no está disponible
        if (!window.catalogo || window.catalogo.length === 0) {
            await window.cargarCatalogo();
        }

        // Análisis de intención con regex
        const consultaLibro = /tienes\s+(el\s+)?libro\s+(.+?)\??|disponible\s+(.+?)\??/i.exec(mensaje);
        const reservaLibro = /reserva\s+(el\s+)?libro\s+(.+?)$/i.exec(mensaje);

        if (consultaLibro) {
            const termino = consultaLibro[2] || consultaLibro[3];
            const resultados = window.catalogo.filter(libro =>
                libro.titulo.toLowerCase().includes(termino) || libro.autor.toLowerCase().includes(termino)
            );
            if (resultados.length > 0) {
                const libro = resultados[0]; // Tomar el primero para simplicidad
                const respuesta = `Sí, tenemos "${libro.titulo}" de ${libro.autor}. Categoría: ${libro.categoria}. Tejuelo: ${libro.signatura}. Disponibles: ${libro.copiasDisponibles}. 😊<br>
                ${crearBoton('Reservar este libro 📚', `simularReserva('${libro.titulo}')`, 'Reservar este libro')}
                ${crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú')}`;
                agregarMensaje(respuesta, 'bot');
            } else {
                agregarMensaje(`No, no tenemos "${termino}" en nuestro catálogo. ¿Quieres sugerirlo? 🔖<br>
                ${crearBoton('Solicitar libro', 'opcionSolicitarLibros()', 'Solicitar libro nuevo')}
                ${crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú')}`, 'bot');
            }
        } else if (reservaLibro) {
            const termino = reservaLibro[2];
            simularReserva(termino);
        } else {
            // Si no reconoce, sugiere opciones
            agregarMensaje('Lo siento, no entendí tu consulta. Prueba con "Tienes el libro X?" o elige una opción. 🤔', 'bot');
            iniciarChat();
        }
    } catch (error) {
        agregarMensaje('Error al procesar. Intenta de nuevo. 😔', 'bot');
    } finally {
        input.disabled = false;
        input.focus();
    }
}

/**
 * Simula una reserva dinámica de un libro.
 * @param {string} termino - Término de búsqueda del libro.
 */
function simularReserva(termino) {
    const resultados = window.catalogo.filter(libro =>
        libro.titulo.toLowerCase().includes(termino.toLowerCase()) || libro.autor.toLowerCase().includes(termino.toLowerCase())
    );
    if (resultados.length > 0) {
        const libro = resultados[0];
        if (libro.copiasDisponibles > 0) {
            // Simular reserva: reducir copias en localStorage
            const catalogoLocal = JSON.parse(localStorage.getItem('catalogo')) || window.catalogo;
            const libroLocal = catalogoLocal.find(l => l.idRegistro === libro.idRegistro);
            libroLocal.copiasDisponibles--;
            localStorage.setItem('catalogo', JSON.stringify(catalogoLocal));
            window.catalogo = catalogoLocal; // Actualizar global
            agregarMensaje(`¡Reserva confirmada para "${libro.titulo}"! Copias restantes: ${libroLocal.copiasDisponibles}. Ve al mostrador para recogerlo. 📚<br>
            ${crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú')}`, 'correcto');
        } else {
            agregarMensaje(`Lo siento, no hay copias disponibles de "${libro.titulo}". ¿Quieres reservar cuando esté disponible?<br>
            ${crearBoton('Ir a formulario de reserva', 'opcionReservarLibros()', 'Formulario de reserva')}
            ${crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú')}`, 'incorrecto');
        }
    } else {
        agregarMensaje(`No encontramos el libro "${termino}". Intenta buscarlo primero. 🔍<br>
        ${crearBoton('Buscar libros', 'opcionBuscarLibros()', 'Buscar libros')}
        ${crearBoton('Volver al menú 🔄', 'iniciarChat()', 'Volver al menú')}`, 'bot');
    }
}

// Funciones existentes para opciones (buscar, reservar, etc.) se mantienen iguales que en la versión anterior
// ... (incluir aquí el código de opcionBuscarLibros, opcionReservarLibros, opcionSolicitarLibros, Trivial, etc., de la versión previa)

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    agregarEstilosRespuesta(); // De versión anterior
    iniciarChat();
});