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

        // Cargar XML de libros
        const responseLibros = await fetch('Catalogo.xml'); // Ajusta el nombre del archivo
        if (!responseLibros.ok) {
            throw new Error(`Error HTTP: ${responseLibros.status} - No se pudo cargar Catalogo.xml`);
        }
        const xmlTextLibros = await responseLibros.text();
        const xmlDocLibros = parser.parseFromString(xmlTextLibros, 'text/xml');
        
        if (xmlDocLibros.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Error al parsear Catalogo.xml. Verifica el formato del archivo.');
        }

        // Extraer libros
        const libros = {};
        const nodosLibros = xmlDocLibros.getElementsByTagName('Libro');
        Array.from(nodosLibros).forEach(libro => {
            const idDocumento = libro.getAttribute('id_documento');
            libros[idDocumento] = {
                titulo: libro.getElementsByTagName('Titulo')[0]?.textContent || 'Sin título',
                autor: libro.getElementsByTagName('Autor')[0]?.textContent || 'Desconocido',
                categoria: libro.getElementsByTagName('Descriptor')[0]?.textContent || 'No disponible',
                fechaEdicion: libro.getElementsByTagName('FechaEdicion')[0]?.textContent || 'No disponible'
            };
        });

        // Extraer ejemplares y vincular con libros
        const ejemplares = xmlDocEjemplares.getElementsByTagName('Ejemplar');
        catalogo = Array.from(ejemplares).map(ejemplar => {
            const idRegistro = ejemplar.getAttribute('IdRegistro') || '';
            const libro = libros[idRegistro] || {};
            return {
                titulo: libro.titulo || 'Sin título',
                autor: libro.autor || 'Desconocido',
                categoria: libro.categoria || 'No disponible',
                signatura: `${ejemplar.getAttribute('Signatura1') || ''} ${ejemplar.getAttribute('Signatura2') || ''} ${ejemplar.getAttribute('Signatura3') || ''}`.trim(),
                isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
                fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
                disponible: ejemplar.getAttribute('Estado') === '0', // 0 = disponible, ajusta si es diferente
                idRegistro: idRegistro
            };
        });
        
        console.log('Catálogo cargado:', catalogo); // Para debug
        if (!catalogo.length) {
            document.getElementById('resultados').innerHTML = '<p>No se encontraron libros en el catálogo.</p>';
        }
    } catch (error) {
        console.error('Error al cargar catálogo:', error);
        document.getElementById('resultados').innerHTML = `<p>Error al cargar el catálogo: ${error.message}</p>`;
    }
}

// Búsqueda de libros
function buscarLibros() {
    if (!catalogo.length) {
        document.getElementById('resultados').innerHTML = '<p>El catálogo aún no se ha cargado. Intenta de nuevo en unos segundos.</p>';
        return;
    }
    const query = document.getElementById('buscarInput').value.toLowerCase();
    const resultados = catalogo.filter(libro => 
        libro.titulo.toLowerCase().includes(query) ||
        libro.autor.toLowerCase().includes(query) ||
        libro.signatura.toLowerCase().includes(query) ||
        libro.isbn.toLowerCase().includes(query) ||
        libro.categoria.toLowerCase().includes(query)
    );
    mostrarResultados(resultados);
}

function mostrarResultados(libros) {
    const div = document.getElementById('resultados');
    if (libros.length === 0) {
        div.innerHTML = '<p>No se encontraron libros.</p>';
        return;
    }
    div.innerHTML = libros.map(libro => `
        <div class="libro">
            <h3>${libro.titulo}</h3>
            <p><strong>Autor:</strong> ${libro.autor}</p>
            <p><strong>Signatura:</strong> <span class="signatura">${libro.signatura || 'Sin signatura'}</span></p>
            <p><strong>ISBN:</strong> ${libro.isbn}</p>
            <p><strong>Categoría:</strong> ${libro.categoria}</p>
            <p><strong>Fecha de ingreso:</strong> ${libro.fecha}</p>
            <p><strong>Disponible:</strong> <span class="${libro.disponible ? 'estado-disponible' : 'estado-no-disponible'}">${libro.disponible ? 'Sí' : 'No'}</span></p>
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

    if (mensajeLower.includes('buscar') || mensajeLower.includes('libro')) {
        respuesta = 'Usa el buscador de arriba para encontrar libros por título (ej. "Cuando Dios aprieta"), autor (ej. "Guillermo Fesser"), signatura (ej. "P ALE his"), ISBN o categoría (ej. "Narrativa"). ¿Quieres un ejemplo?';
    } else if (mensajeLower.includes('disponible') || mensajeLower.includes('prestado')) {
        respuesta = 'Los libros con estado "Sí" están disponibles para préstamo. Si dice "No", están prestados. Prueba buscar por título o autor para verificar un libro específico.';
    } else if (mensajeLower.includes('recomendación') || mensajeLower.includes('recomendar')) {
        respuesta = 'Te recomiendo "Cuando Dios aprieta, ahoga pero bien" de Guillermo Fesser, un libro de narrativa (busca por título o autor). ¿Qué género prefieres: narrativa, historia o poesía?';
    } else if (mensajeLower.includes('autor') || mensajeLower.includes('escritor')) {
        respuesta = 'Puedes buscar libros por autor, como "Guillermo Fesser". Dime un autor o género para ayudarte a encontrar algo en el catálogo.';
    } else if (mensajeLower.includes('biblioteca')) {
        respuesta = '¡Bienvenido a la biblioteca escolar! Usa el buscador para encontrar libros por título, autor, signatura, ISBN o categoría. Si necesitas ayuda con préstamos o contactar al bibliotecario, dime más.';
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