/**
 * Chatbot simplificado para Biblioteca Hipatia usando Groq API (100% gratuita).
 * API key: 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
 * Solo integra la IA de Groq con filtros para limitaciones (no porno, no malsonantes).
 * Sugiere preguntas como reseñas, autores, sinopsis, etc., basadas en el catálogo.
 * Fallback local si la API falla.
 */

// Configuración de Groq (100% gratis, alta cuota mensual)
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192'; // Modelo gratuito, rápido y eficiente

// Lista de palabras malsonantes y prohibidas (ampliada para filtros)
const PALABRAS_PROHIBIDAS = [
    'puta', 'joder', 'coño', 'mierda', 'follar', 'cagar', 'polla', 'tetas', 'culo', 'gilipollas',
    'cabron', 'hijoputa', 'porno', 'porn', 'sexo', 'xxx', 'nude', 'erotico', 'masturbar', 'orgasmo',
    'pene', 'vagina', 'anal', 'oral', 'fisting', 'bdsm', 'zorra', 'maricon', 'puto', 'hostia'
];

/**
 * Añade un mensaje al panel de chat con animación suave.
 * @param {string} texto - Texto del mensaje.
 * @param {string} tipo - Tipo de mensaje ('bot', 'user', 'incorrecto').
 */
function agregarMensaje(texto, tipo = 'bot') {
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
 * Llama a la API de Groq con el catálogo como contexto y sugerencias de preguntas.
 * @param {string} mensajeUsuario - Mensaje del usuario.
 * @returns {Promise<string>} Respuesta de Groq o fallback.
 */
async function consultarGroq(mensajeUsuario) {
    const prompt = `
    Eres una bibliotecaria IA en la Biblioteca Hipatia, respondiendo en español con humor y emojis.
    Catálogo de libros disponible: ${JSON.stringify(window.catalogo || 'Cargando...')}.
    Usa el catálogo para responder sobre disponibilidad, autores, sinopsis breves, reseñas cortas o fecha de publicación.
    Sugiere preguntas relacionadas como: "¿Quieres una reseña del libro X?", "¿Quién es el autor de Y?", "¿Una sinopsis de Z?" o "¿Cuándo se publicó W?".
    Si el usuario pregunta por reseñas, autores o sinopsis, responde basado en conocimiento general o catálogo.
    Usuario: ${mensajeUsuario}.
    Responde breve, útil y amigable. Si no sabes, sugiere buscar en el catálogo.
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
        return fallbackLocal(mensajeUsuario); // Fallback gratuito
    }
}

/**
 * Fallback local gratuito si la API falla.
 * @param {string} mensaje - Mensaje del usuario.
 * @returns {string} Respuesta simulada.
 */
function fallbackLocal(mensaje) {
    const mensajeLower = mensaje.toLowerCase();
    if (mensajeLower.includes('reseña') || mensajeLower.includes('sinopsis') || mensajeLower.includes('autor') || mensajeLower.includes('publicado')) {
        const termino = mensajeLower.match(/(reseña|sinopsis|autor|publicado)\s+(de\s+)?el\s+libro\s+(.+?)(?:\?|$)/)?.[3] || '';
        const resultados = window.catalogo?.filter(libro =>
            libro.titulo.toLowerCase().includes(termino) || libro.autor.toLowerCase().includes(termino)
        ) || [];
        if (resultados.length > 0) {
            const libro = resultados[0];
            let respuesta = `Sobre "${libro.titulo}" de ${libro.autor} (Categoría: ${libro.categoria}, Publicado: ${libro.fechaEdicion}). `;
            if (mensajeLower.includes('reseña') || mensajeLower.includes('sinopsis')) {
                respuesta += 'Sinopsis breve: Una historia fascinante sobre [tema genérico basado en categoría]. ¡Léelo! 📖';
            }
            return respuesta + ' Sugerencia: "¿Quieres el autor de otro libro?" 😊';
        }
        return 'No encontré el libro. Sugerencia: "¿Reseña de "El Quijote"?" 📚';
    }
    if (mensajeLower.includes('tienes') || mensajeLower.includes('disponible')) {
        const termino = mensajeLower.match(/(libro|de)\s+(.+?)(?:\?|$)/)?.[2] || '';
        const resultados = window.catalogo?.filter(libro =>
            libro.titulo.toLowerCase().includes(termino) || libro.autor.toLowerCase().includes(termino)
        ) || [];
        if (resultados.length > 0) {
            const libro = resultados[0];
            return `Sí, tenemos "${libro.titulo}" de ${libro.autor}. Disponibles: ${libro.copiasDisponibles}. Sugerencia: "¿Reseña de este libro?" 😊`;
        }
        return 'No lo encontramos. Sugerencia: "¿Autor de "Cien años de soledad"?" 🔍';
    }
    return 'Modo local: Prueba "¿Tienes el libro X?" o "¿Reseña de Y?". 📚';
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
        agregarMensaje('Lo siento, no puedo responder a consultas con lenguaje inapropiado o contenido prohibido. Prueba otra pregunta. 😊 Sugerencia: "¿Reseña de un libro clásico?"', 'incorrecto');
        input.value = '';
        input.focus();
        return;
    }
    
    agregarMensaje(mensaje, 'user');
    input.value = '';
    input.disabled = true;
    input.placeholder = 'Pensando...';

    if (!window.catalogo) await window.cargarCatalogo();

    const respuesta = await consultarGroq(mensaje);
    agregarMensaje(respuesta, 'bot');

    input.disabled = false;
    input.placeholder = 'Escribe tu consulta...';
    input.focus();
}

/**
 * Inicializa el chatbot al cargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .mensaje.incorrecto { background-color: var(--btn-solicitud); color: black; padding: 10px; border-radius: 4px; }
    `;
    document.head.appendChild(style);
    agregarMensaje('¡Hola! Soy la IA de la Biblioteca Hipatia. Pregunta sobre libros, reseñas, autores o sinopsis. Ejemplo: "¿Reseña de "El Quijote"?" 😊', 'bot');
    document.getElementById('chatInput').focus();
});