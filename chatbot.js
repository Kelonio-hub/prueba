/**
 * Chatbot para Biblioteca Hipatia usando Groq API (100% gratuita).
 * API key: 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
 * Lee Ejemplares.xml con tags compatibles con index.html.
 * Responde con Groq desde el inicio, con filtros y sugerencias.
 * Usa variable local, no depende de window.catalogo.
 */

// Configuración de Groq
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192';

// Lista de palabras prohibidas
const PALABRAS_PROHIBIDAS = [
    'puta', 'joder', 'coño', 'mierda', 'follar', 'cagar', 'polla', 'tetas', 'culo', 'gilipollas',
    'cabron', 'hijoputa', 'porno', 'porn', 'sexo', 'xxx', 'nude', 'erotico', 'masturbar', 'orgasmo',
    'pene', 'vagina', 'anal', 'oral', 'fisting', 'bdsm', 'zorra', 'maricon', 'puto', 'hostia'
];

// Variable local para el catálogo
let catalogo = null;

/**
 * Carga Ejemplares.xml con tags compatibles con index.html.
 * @returns {Promise<Array>} Lista de libros.
 */
async function cargarCatalogo() {
    if (catalogo) {
        console.log('Usando catálogo local:', catalogo.length, 'libros');
        return catalogo;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://kelonio-hub.github.io/prueba/Ejemplares.xml', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Error al parsear XML.');
        }
        const libros = {};
        Array.from(xmlDoc.getElementsByTagName('Libro')).forEach(libro => {
            const idDocumento = libro.getAttribute('id_documento');
            const rawCategoria = libro.getElementsByTagName('Descriptor')[0]?.textContent || 'No disponible';
            const categoriaMap = {
                'narrativa': 'Narrativa',
                'poesia': 'Poesía',
                'poesía': 'Poesía',
                'teatro': 'Teatro',
                'literatura inglesa': 'Literatura inglesa',
                'otras materias': 'Otras Materias',
                'comic': 'Cómic',
                'cómic': 'Cómic'
            };
            const categoria = categoriaMap[rawCategoria.toLowerCase()] || rawCategoria;
            libros[idDocumento] = {
                idRegistro: idDocumento,
                titulo: libro.getElementsByTagName('Titulo')[0]?.textContent || 'Sin título',
                autor: libro.getElementsByTagName('Autor')[0]?.textContent || 'Desconocido',
                categoria: categoria,
                fechaEdicion: libro.getElementsByTagName('FechaEdicion')[0]?.textContent || 'No disponible'
            };
        });
        const librosAgrupados = {};
        Array.from(xmlDoc.getElementsByTagName('Ejemplar')).forEach(ejemplar => {
            const idRegistro = ejemplar.getAttribute('IdRegistro') || '';
            const libro = libros[idRegistro] || {};
            let signatura1 = ejemplar.getAttribute('Signatura1') || '';
            const signaturaMap = {
                'Narrativa': 'N',
                'Poesía': 'P',
                'Teatro': 'T',
                'Literatura inglesa': 'LI',
                'Otras Materias': 'OM',
                'Cómic': 'C'
            };
            signatura1 = signaturaMap[libro.categoria] || signatura1 || '';
            const signatura = `${signatura1}-${ejemplar.getAttribute('Signatura2') || ''}-${ejemplar.getAttribute('Signatura3') || ''}`.trim();
            if (!librosAgrupados[idRegistro]) {
                librosAgrupados[idRegistro] = {
                    idRegistro: idRegistro,
                    titulo: libro.titulo || 'Sin título',
                    autor: libro.autor || 'Desconocido',
                    categoria: libro.categoria || 'No disponible',
                    fechaEdicion: libro.fechaEdicion || 'No disponible',
                    signatura: signatura || 'No disponible',
                    isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
                    fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
                    copiasTotales: 0,
                    copiasDisponibles: 0
                };
            }
            librosAgrupados[idRegistro].copiasTotales += 1;
            if (ejemplar.getAttribute('Estado') === '0') {
                librosAgrupados[idRegistro].copiasDisponibles += 1;
            }
        });
        catalogo = Object.values(librosAgrupados);
        console.log('Catálogo cargado en chatbot:', catalogo.length, 'libros');
        return catalogo;
    } catch (error) {
        console.error('Error cargando Ejemplares.xml:', error);
        catalogo = [];
        return [];
    }
}

/**
 * Añade un mensaje al panel de chat con animación suave.
 * @param {string} texto - Texto del mensaje.
 * @param {string} tipo - Tipo de mensaje ('bot', 'user', 'incorrecto').
 */
function agregarMensaje(texto, tipo = 'bot') {
    const div = document.getElementById('chatMensajes');
    if (!div) {
        console.error('Error: #chatMensajes no encontrado');
        return;
    }
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
 * Llama a la API de Groq con contexto del catálogo y sugerencias.
 * @param {string} mensajeUsuario - Mensaje del usuario.
 * @returns {Promise<string>} Respuesta de Groq o fallback.
 */
async function consultarGroq(mensajeUsuario) {
    const catalogo = await cargarCatalogo();
    const titulos = catalogo?.slice(0, 3).map(libro => libro.titulo) || ['El Quijote', 'Cien años de soledad', '1984'];
    const sugerencias = [
        `¿Reseña de "${titulos[0]}"?`,
        `¿Quién escribió "${titulos[1]}"?`,
        `¿Sinopsis de "${titulos[2]}"?`,
        `¿Cuándo se publicó "${titulos[0]}"?`
    ].join(' ');

    const prompt = `
    Eres una bibliotecaria IA en la Biblioteca Hipatia, respondiendo en español con humor y emojis.
    Catálogo de libros: ${JSON.stringify(catalogo?.slice(0, 5) || 'No disponible')}.
    Responde a consultas sobre disponibilidad, autores, sinopsis breves (máximo 50 palabras), reseñas cortas (máximo 100 palabras) o fechas de publicación, usando el catálogo cuando sea posible.
    Si el usuario saluda (e.g., "Hola"), responde amigablemente y sugiere preguntas.
    Si la consulta es vaga, sugiere: ${sugerencias}.
    Filtro: No respondas a contenido inapropiado (porno, malsonantes).
    Usuario: ${mensajeUsuario}.
    Respuesta breve, útil y con emojis.
    `;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`Error API: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error Groq:', error);
        return await fallbackLocal(mensajeUsuario);
    }
}

/**
 * Fallback local si la API de Groq falla.
 * @param {string} mensaje - Mensaje del usuario.
 * @returns {Promise<string>} Respuesta simulada.
 */
async function fallbackLocal(mensaje) {
    const catalogo = await cargarCatalogo();
    const mensajeLower = mensaje.toLowerCase();
    const titulos = catalogo?.slice(0, 3).map(libro => libro.titulo) || ['El Quijote', 'Cien años de soledad', '1984'];
    const sugerencias = `Prueba: "¿Reseña de ${titulos[0]}?" o "¿Quién escribió ${titulos[1]}?" 😊`;

    if (mensajeLower.includes('hola') || mensajeLower.trim() === '') {
        return `¡Hola! Bienvenido a la Biblioteca Hipatia. ¿En qué te ayudo? ${sugerencias}`;
    }
    if (mensajeLower.includes('reseña') || mensajeLower.includes('sinopsis')) {
        const termino = mensajeLower.match(/(reseña|sinopsis)\s+(de\s+)?el\s+libro\s+(.+?)(?:\?|$)/)?.[3] || '';
        const resultados = catalogo?.filter(libro =>
            libro.titulo.toLowerCase().includes(termino) || libro.autor.toLowerCase().includes(termino)
        ) || [];
        if (resultados.length > 0) {
            const libro = resultados[0];
            let respuesta = `Sobre "${libro.titulo}" (${libro.categoria}): `;
            if (mensajeLower.includes('reseña')) {
                respuesta += `Una obra destacada de ${libro.autor}. Explora temas profundos de su género. ¡Léelo! 📖`;
            } else {
                respuesta += `Sinopsis: Una historia envolvente sobre [tema genérico de ${libro.categoria}].`;
            }
            return respuesta + ` ${sugerencias}`;
        }
        return `No encontré el libro. ${sugerencias}`;
    }
    if (mensajeLower.includes('autor') || mensajeLower.includes('escritor')) {
        const termino = mensajeLower.match(/(autor|escritor)\s+(de\s+)?el\s+libro\s+(.+?)(?:\?|$)/)?.[3] || '';
        const resultados = catalogo?.filter(libro =>
            libro.titulo.toLowerCase().includes(termino)
        ) || [];
        if (resultados.length > 0) {
            const libro = resultados[0];
            return `El autor de "${libro.titulo}" es ${libro.autor}. ${sugerencias}`;
        }
        return `No encontré el libro. ${sugerencias}`;
    }
    if (mensajeLower.includes('publicado') || mensajeLower.includes('publicación')) {
        const termino = mensajeLower.match(/(publicado|publicación)\s+(de\s+)?el\s+libro\s+(.+?)(?:\?|$)/)?.[3] || '';
        const resultados = catalogo?.filter(libro =>
            libro.titulo.toLowerCase().includes(termino)
        ) || [];
        if (resultados.length > 0) {
            const libro = resultados[0];
            return `"${libro.titulo}" fue publicado en ${libro.fechaEdicion}. ${sugerencias}`;
        }
        return `No encontré el libro. ${sugerencias}`;
    }
    if (mensajeLower.includes('tienes') || mensajeLower.includes('disponible')) {
        const termino = mensajeLower.match(/(libro|de)\s+(.+?)(?:\?|$)/)?.[2] || '';
        const resultados = catalogo?.filter(libro =>
            libro.titulo.toLowerCase().includes(termino) || libro.autor.toLowerCase().includes(termino)
        ) || [];
        if (resultados.length > 0) {
            const libro = resultados[0];
            return `Sí, tenemos "${libro.titulo}" de ${libro.autor}. Disponibles: ${libro.copiasDisponibles}. ${sugerencias}`;
        }
        return `No lo encontramos. ${sugerencias}`;
    }
    return `No entendí, pero estoy aquí para ayudar. ${sugerencias}`;
}

/**
 * Procesa el mensaje del usuario con filtros y Groq/fallback.
 */
async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;

    // Filtro de palabras prohibidas
    const mensajeLower = mensaje.toLowerCase();
    const contieneProhibida = PALABRAS_PROHIBIDAS.some(palabra => mensajeLower.includes(palabra));
    if (contieneProhibida) {
        agregarMensaje(mensaje, 'user');
        agregarMensaje('Lo siento, no puedo responder a consultas con lenguaje inapropiado. Prueba: "¿Reseña de "El Quijote"?" 😊', 'incorrecto');
        input.value = '';
        input.focus();
        return;
    }

    agregarMensaje(mensaje, 'user');
    input.value = '';
    input.disabled = true;
    input.placeholder = 'Pensando...';

    const respuesta = await consultarGroq(mensaje);
    agregarMensaje(respuesta, 'bot');

    input.disabled = false;
    input.placeholder = 'Escribe tu consulta...';
    input.focus();
}

/**
 * Estilos para respuestas incorrectas.
 */
function agregarEstilosRespuesta() {
    const style = document.createElement('style');
    style.textContent = `
        .mensaje.incorrecto { background-color: var(--btn-solicitud); color: black; padding: 10px; border-radius: 4px; }
    `;
    document.head.appendChild(style);
}

/**
 * Inicializa el chatbot al cargar la página (no bloquea splash).
 */
document.addEventListener('DOMContentLoaded', () => {
    agregarEstilosRespuesta();
    agregarMensaje('¡Hola! Soy la IA de la Biblioteca Hipatia (gratis con Groq). Pregunta sobre libros, reseñas, autores o sinopsis. Ejemplo: "¿Reseña de "El Quijote"?" 😊', 'bot');
    document.getElementById('chatInput')?.focus();
});