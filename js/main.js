import { login } from './auth.js';
import { cargarCatalogo, buscarLibros } from './catalog.js';
import { reservarLibro, marcarRecogido, devolverLibro } from './reservations.js';
import { renderAdminTasks, renderAdminHistory, renderApprovedEmails, exportHistoryToCSV } from './admin.js';
import { renderProgreso, addPoints } from './gamification.js';
import { initChatbot } from './chatbot.js';
import { applyCustomColors, initColorCustomization } from './customization.js';
import { showToast, toggleModal, sanitizeInput } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Ocultar splash screen
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
    }, 3000);

    // Cargar catálogo
    cargarCatalogo();

    // Aplicar colores personalizados
    const customColors = JSON.parse(localStorage.getItem('customColors')) || {};
    applyCustomColors(customColors);

    // Inicializar chatbot y personalización
    initChatbot();
    initColorCustomization();

    // Configurar eventos
    document.getElementById('loginButton').addEventListener('click', () => {
        const email = document.getElementById('emailInput').value;
        login(email);
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const html = document.documentElement;
        html.setAttribute('data-theme', html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        showToast('Sesión cerrada', 'success');
    });

    document.getElementById('buscarButton').addEventListener('click', () => {
        const query = document.getElementById('buscarInput').value;
        buscarLibros(query);
    });

    document.getElementById('reservarButton').addEventListener('click', () => {
        const isbn = prompt('Introduce el ISBN del libro:');
        const email = document.getElementById('emailInput').value || 'test@educa.madrid.org';
        if (reservarLibro(isbn, email)) {
            addPoints(email, 'Reserva', 15);
        }
    });

    document.getElementById('verProgresoButton').addEventListener('click', () => {
        const email = document.getElementById('emailInput').value || 'test@educa.madrid.org';
        renderProgreso(email);
        toggleModal('modalProgreso', true);
    });

    document.getElementById('personalizarColoresButton').addEventListener('click', () => {
        toggleModal('modalColores', true);
    });

    document.getElementById('chatbotButton').addEventListener('click', () => {
        toggleModal('modalChatbot', true);
    });

    document.getElementById('adminTabs')?.addEventListener('click', e => {
        if (e.target.classList.contains('tab')) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const tab = e.target.dataset.tab;
            if (tab === 'tareas') renderAdminTasks();
            else if (tab === 'historial') renderAdminHistory();
            else if (tab === 'correos') renderApprovedEmails();
        }
    });

    document.getElementById('exportCSV')?.addEventListener('click', exportHistoryToCSV);

    // Cerrar modales
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
});
