// Cargar datos del catálogo
let catalogo = [];

// Función para cargar datos JSON
async function cargarCatalogo() {
    try {
        const response = await fetch('catalogo.json');
        catalogo = await response.json();
    } catch (error) {
        console.error('Error al cargar catálogo:', error);
    }
}

// Búsqueda de libros
function buscarLibros() {
    const query = document.getElementById('buscarInput').value.toLowerCase();
    const resultados = catalogo.filter(libro => 
        libro.titulo.toLowerCase().includes(query) ||
        libro.autor.toLowerCase().includes(query) ||
        libro.isbn.includes(query)
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
            <p><strong>ISBN:</strong> ${libro.isbn}</p>
            <p><strong>Categoría:</strong> ${libro.categoria}</p>
            <p><strong>Disponible:</strong> ${libro.disponible ? 'Sí' : 'No'}</p>
        </div>
    `).join('');
}

// Chatbot con Grok API
const API_KEY = 'TU_CLAVE_API_AQUI'; // Reemplaza con tu clave de https://x.ai/api
const API_URL = 'https://api.x.ai/v1/chat/completions'; // Endpoint de ejemplo; verifica docs

async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;

    // Mostrar mensaje del usuario
    agregarMensaje(mensaje, 'user');
    input.value = '';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'grok-3', // O el modelo disponible
                messages: [{ role: 'user', content: mensaje + ' (Contexto: Catálogo de biblioteca escolar con libros como: ' + JSON.stringify(catalogo.slice(0,5)) + ')' }]
            })
        });

        const data = await response.json();
        const respuesta = data.choices[0].message.content;
        agregarMensaje(respuesta, 'bot');
    } catch (error) {
        agregarMensaje('Error: Verifica tu API key o conexión.', 'bot');
    }
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