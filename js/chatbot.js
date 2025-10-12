import { showToast, toggleModal, sanitizeInput } from './utils.js';

const respuestas = {
    perfil: 'Tu perfil incluye tu correo, reservas activas y progreso. ¿Quieres ver tu progreso?',
    reservar: 'Para reservar un libro, busca en el catálogo y selecciona "Reservar".',
    ayuda: 'Estoy aquí para ayudarte. Pregunta sobre tu perfil, reservas, o cómo usar la biblioteca.',
    hola: '¡Hola! Soy Hipat-IA, tu asistente virtual. ¿En qué te ayudo?'
};

export function handleChatbotInput(input) {
    input = sanitizeInput(input.toLowerCase());
    const messages = document.getElementById('chatbotMessages');
    messages.innerHTML += `<p><strong>Tú:</strong> ${input}</p>`;

    const respuesta = Object.keys(respuestas).find(key => input.includes(key))
        ? respuestas[Object.keys(respuestas).find(key => input.includes(key))]
        : 'No entiendo tu pregunta. Intenta con palabras como "perfil", "reservar" o "ayuda".';

    messages.innerHTML += `<p><strong>Hipat-IA:</strong> ${respuesta}</p>`;
    messages.scrollTop = messages.scrollHeight;
}

export function initChatbot() {
    document.getElementById('chatbotSend').addEventListener('click', () => {
        const input = document.getElementById('chatbotInput').value;
        if (input) {
            handleChatbotInput(input);
            document.getElementById('chatbotInput').value = '';
        }
    });

    document.getElementById('chatbotInput').addEventListener('keypress', e => {
        if (e.key === 'Enter' && e.target.value) {
            handleChatbotInput(e.target.value);
            e.target.value = '';
        }
    });
}