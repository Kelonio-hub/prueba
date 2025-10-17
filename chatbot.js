// Configuración de la API de xAI
const API_KEY = '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';
const API_URL = 'https://api.x.ai/v1/chat/completions';

// Obtener elementos del DOM
const chatMensajes = document.getElementById('chatMensajes');
const chatInput = document.getElementById('chatInput');

// Función para agregar un mensaje al chat
function agregarMensaje(texto, esUsuario = false) {
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje ${esUsuario ? 'user' : 'bot'}`;
    mensajeDiv.textContent = texto;
    chatMensajes.appendChild(mensajeDiv);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
}

// Función para sanitizar entrada del usuario (evitar XSS)
function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Función para buscar en el catálogo (simplificada del script original)
function buscarEnCatalogo(query) {
    const lowerQuery = query.toLowerCase().trim();
    return catalogo.filter(libro =>
        libro.titulo.toLowerCase().includes(lowerQuery) ||
        libro.autor.toLowerCase().includes(lowerQuery) ||
        libro.categoria.toLowerCase().includes(lowerQuery) ||
        libro.signatura.toLowerCase().includes(lowerQuery) ||
        libro.isbn.toLowerCase().includes(lowerQuery)
    ).slice(0, 3); // Limitar a 3 resultados para mantener respuestas concisas
}

// Función para formatear resultados del catálogo
function formatearResultados(resultados) {
    if (!resultados.length) {
        return 'No encontré libros que coincidan con tu búsqueda. ¿Puedes proporcionar más detalles?';
    }
    return resultados.map(libro => `
        - **Título**: ${libro.titulo}
          **Autor**: ${libro.autor}
          **Categoría**: ${libro.categoria}
          **Tejuelo**: ${libro.signatura}
          **Disponibles**: ${libro.copiasDisponibles}
    `).join('\n');
}

// Función para enviar mensaje a la API de Grok
async function enviarMensaje() {
    const mensaje = sanitizeInput(chatInput.value.trim());
    if (!mensaje) {
        showToast('Por favor, escribe un mensaje.', 'warning');
        return;
    }

    // Agregar mensaje del usuario al chat
    agregarMensaje(mensaje, true);
    chatInput.value = '';

    // Buscar en el catálogo localmente primero
    const resultadosCatalogo = buscarEnCatalogo(mensaje);
    let contexto = '';
    if (resultadosCatalogo.length > 0) {
        contexto = `Resultados del catálogo de la Biblioteca Hipatia:\n${formatearResultados(resultadosCatalogo)}\n\n`;
    }

    // Preparar el prompt para Grok
    const prompt = `
        Eres Hipat-IA, la bibliotecaria virtual de la Biblioteca Hipatia del IES Carpe Diem. 
        Tu rol es asistir a los usuarios con consultas sobre libros, recomendaciones, sinopsis, y el catálogo de la biblioteca. 
        Responde de manera amigable, precisa y en español, usando un tono profesional pero accesible.
        Si el usuario pregunta por libros específicos, utiliza la información del catálogo proporcionada. 
        Si no hay información suficiente, ofrece una respuesta general o pide más detalles.
        No generes contenido que no esté relacionado con la biblioteca o los libros.

        **Contexto del catálogo**:
        ${contexto}

        **Mensaje del usuario**:
        ${mensaje}

        **Instrucciones**:
        - Si el mensaje está relacionado con el catálogo, usa los resultados proporcionados.
        - Si es una pregunta general sobre libros o recomendaciones, responde con información útil y relevante.
        - Mantén las respuestas concisas (máximo 200 palabras).
        - Usa un formato claro, con listas o párrafos según corresponda.
        - Finaliza con una pregunta para mantener la conversación, como "¿Qué más puedo ayudarte a encontrar?".
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'grok-3',
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: mensaje }
                ],
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const respuesta = data.choices[0]?.message?.content.trim() || 'Lo siento, no pude procesar tu solicitud.';

        // Agregar respuesta del bot al chat
        agregarMensaje(respuesta);
    } catch (error) {
        console.error('Error al conectar con la API:', error);
        showToast('Error al conectar con Hipat-IA. Intenta de nuevo.', 'error');
        agregarMensaje('Lo siento, ocurrió un error. ¿Puedes intentarlo de nuevo?');
    }
}

// Manejar el evento de enviar mensaje
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enviarMensaje();
    }
});

// Inicializar el chat con un mensaje de bienvenida
document.addEventListener('DOMContentLoaded', () => {
    agregarMensaje('¡Hola! Soy Hipat-IA, tu bibliotecaria virtual. ¿Buscas un libro, una recomendación o una sinopsis?');
});