// Cargar datos del catálogo
let catalogo = [];

async function cargarCatalogo() {
    try {
        // Cargar XML de ejemplares
        const responseEjemplares = await fetch('Ejemplares.xml'); // Ajusta el nombre del archivo
        if (!responseEjemplares.ok) {
            throw new Error(`Error HTTP: ${responseEjemplares.status} - No se pudo cargar Ejemplares.xml`);
        }
        const xmlTextEjemplares = await responseEjemplares.text();
        const parser = new DOMParser();
        const xmlDocEjemplares = parser.parseFromString(xmlTextEjemplares, 'text/xml');
        
        if (xmlDocEjemplares.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Error al parsear Ejemplares.xml. Verifica el formato del archivo.');
        }

        // Cargar XML de autores
        const responseAutores = await fetch('Catalogo.xml'); // Ajusta el nombre del archivo
        if (!responseAutores.ok) {
            throw new Error(`Error HTTP: ${responseAutores.status} - No se pudo cargar Catalogo.xml`);
        }
        const xmlTextAutores = await responseAutores.text();
        const xmlDocAutores = parser.parseFromString(xmlTextAutores, 'text/xml');
        
        if (xmlDocAutores.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Error al parsear Catalogo.xml. Verifica el formato del archivo.');
        }

        // Extraer autores
        const autores = {};
        const nodosAutores = xmlDocAutores.getElementsByTagName('Catalogo_Auxiliar_Autor');
        Array.from(nodosAutores).forEach(autor => {
            const idDocumento = autor.getAttribute('id_documento');
            const nombre = autor.getElementsByTagName('Nombre')[0]?.textContent || 'Desconocido';
            autores[idDocumento] = nombre;
        });

        // Extraer ejemplares y vincular con autores
        const ejemplares = xmlDocEjemplares.getElementsByTagName('Ejemplar');
        catalogo = Array.from(ejemplares).map(ejemplar => {
            const idRegistro = ejemplar.getAttribute('IdRegistro') || '';
            return {
                signatura: `${ejemplar.getAttribute('Signatura1') || ''} ${ejemplar.getAttribute('Signatura2') || ''} ${ejemplar.getAttribute('Signatura3') || ''}`.trim(),
                isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
                fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
                estado: ejemplar.getAttribute('Estado') === '0', // 0 = disponible, ajusta si es diferente
                idRegistro: idRegistro,
                autor: autores[idRegistro] || 'No disponible'
            };
        });
        
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
        ejemplar.isbn.toLowerCase().includes(query) ||
        ejemplar.autor.toLowerCase().includes(query)
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
            <p><strong>Autor:</strong> ${ejemplar.autor}</p>
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
        respuesta = '¡Claro! Usa el buscador de arriba para encontrar ejemplares por signatura (ej. "P ALE his"), ISBN o autor (ej. "Ana María Matute"). Si no sabes qué buscar, dime un género como "historia" o "ficción".';
    } else if (mensajeLower.includes('disponible') || mensajeLower.includes('prestado')) {
        respuesta = 'Los ejemplares con estado "Sí" están disponibles para préstamo. Si dice "No", están prestados. Prueba buscar por signatura, ISBN o autor para verificar un ejemplar específico.';
    } else if (mensajeLower.includes('recomendación') || mensajeLower.includes('recomendar')) {
        respuesta = 'Te recomendaría un libro de Ana María Matute, como "Primera memoria" (busca por autor "Matute"). ¿Qué género prefieres: aventuras, historia o poesía?';
    } else if (mensajeLower.includes('autor') || mensajeLower.includes('escritor')) {
        respuesta = 'Puedes buscar ejemplares por autor en el buscador, como "Ana María Matute". Dime un autor o género para ayudarte a encontrar algo.';
    } else if (mensajeLower.includes('biblioteca')) {
        respuesta = '¡Bienvenido a la biblioteca escolar! Usa el buscador para encontrar ejemplares por signatura, ISBN o autor. Si necesitas ayuda con préstamos o contactar al bibliotecario, dime más.';
    } else {
        respuesta = `Hola, soy el asistente de la biblioteca. Tu pregunta: "${mensaje}". Prueba con palabras como "buscar", "recomendación", "autor" o "disponible" para obtener ayuda con el catálogo. ¿Qué necesitas?`;
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