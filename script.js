// Cargar datos del catálogo
let catalogo = [];

async function cargarCatalogo() {
    try {
        const response = await fetch('Ejemplares.xml'); // Ajusta el nombre del archivo XML
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - No se pudo cargar Ejemplares.xml`);
        }
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Verificar si hay errores de parseo
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Error al parsear el XML. Verifica el formato del archivo.');
        }

        // Extraer ejemplares
        const ejemplares = xmlDoc.getElementsByTagName('Ejemplar');
        catalogo = Array.from(ejemplares).map(ejemplar => ({
            signatura: `${ejemplar.getAttribute('Signatura1') || ''} ${ejemplar.getAttribute('Signatura2') || ''} ${ejemplar.getAttribute('Signatura3') || ''}`.trim(),
            isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
            fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
            estado: ejemplar.getAttribute('Estado') === '0', // 0 = disponible, ajusta si es diferente
            idRegistro: ejemplar.getAttribute('IdRegistro') || 'No disponible'
        }));
        
        console.log('Catálogo cargado:', catalogo); // Para debug
        if (!catalogo.length) {
            document.getElementById('resultados').innerHTML = '<p>No se encontraron ejemplares en el catálogo.</p>';
        }
    } catch (error) {
        console.error('Error al cargar catálogo:', error);
        document.getElementById('resultados').innerHTML = `<p>Error al cargar el catálogo: ${error.message}</p>`;
    }
}

// Búsqueda de ejemplares
function buscarLibros() {
    if (!catalogo.length) {
        document.getElementById('resultados').innerHTML = '<p>El catálogo aún no se ha cargado. Intenta de nuevo en unos segundos.</p>';
        return;
    }
    const query = document.getElementById('buscarInput').value.toLowerCase();
    const resultados = catalogo.filter(ejemplar => 
        ejemplar.signatura.toLowerCase().includes(query) ||
        ejemplar.isbn.toLowerCase().includes(query)
    );
    mostrarResultados(resultados);
}

function mostrarResultados(ejemplares) {
    const div = document.getElementById('resultados');
    if (ejemplares.length === 0) {
        div.innerHTML = '<p>No se encontraron ejemplares.</p>';
        return;
    }
    div.innerHTML = ejemplares.map(ejemplar => `
        <div class="libro">
            <h3 class="signatura">${ejemplar.signatura || 'Sin signatura'}</h3>
            <p><strong>ISBN:</strong> ${ejemplar.isbn}</p>
            <p><strong>Fecha de ingreso:</strong> ${ejemplar.fecha}</p>
            <p><strong>Disponible:</strong> <span class="${ejemplar.estado ? 'estado-disponible' : 'estado-no-disponible'}">${ejemplar.estado ? 'Sí' : 'No'}</span></p>
            <p><strong>ID Registro:</strong> ${ejemplar.idRegistro}</p>
        </div>
    `).join('');
}

// Chatbot SIMULADO (sin API real)
async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;

    // Mostrar mensaje del usuario
    agregarMensaje(mensaje, 'user');
    input.value = '';

    // Simulación de respuesta
    let respuesta = '';
    const mensajeLower = mensaje.toLowerCase();

    if (mensajeLower.includes('buscar') || mensajeLower.includes('libro') || mensajeLower.includes('ejemplar')) {
        respuesta = '¡Claro! Usa el buscador de arriba para encontrar ejemplares por signatura (ej. "P ALE his") o ISBN. Si no sabes la signatura, dime un tema como "historia" o "ficción" y te ayudo.';
    } else if (mensajeLower.includes('disponible') || mensajeLower.includes('prestado')) {
        respuesta = 'En el catálogo, los ejemplares con estado "Sí" están disponibles. Si dice "No", están prestados. Prueba buscar por signatura o ISBN para verificar un ejemplar específico.';
    } else if (mensajeLower.includes('recomendación') || mensajeLower.includes('recomendar')) {
        respuesta = 'Te recomendaría un libro de aventuras o historia, pero necesito el catálogo completo para sugerir algo específico. Prueba buscar por signatura como "P ALE" o dime qué género prefieres.';
    } else if (mensajeLower.includes('biblioteca')) {
        respuesta = '¡Bienvenido a la biblioteca escolar! Usa el buscador para encontrar ejemplares por signatura o ISBN. Si necesitas ayuda con préstamos o quieres contactar al bibliotecario, dime más.';
    } else {
        respuesta = `Hola, soy el asistente de la biblioteca. Tu pregunta: "${mensaje}". Prueba con palabras como "buscar", "recomendación" o "disponible" para obtener ayuda con el catálogo. ¿Qué necesitas?`;
    }

    // Añadir un pequeño delay para simular procesamiento
    setTimeout(() => {
        agregarMensaje(respuesta, 'bot');
    }, 1000); // 1 segundo de espera
}

function agregarMensaje(texto, tipo) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.textContent = texto;
    div.appendChild(p);
    div.scrollTop = div.scrollHeight;
}

// Inicializar al cargar la página
cargarCatalogo();