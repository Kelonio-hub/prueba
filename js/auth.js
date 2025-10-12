import { showToast, toggleModal } from './utils.js';

export let approvedEmails = JSON.parse(localStorage.getItem('approvedEmails')) || [];

export function login(email) {
    email = sanitizeInput(email);
    if (!email.endsWith('@educa.madrid.org')) {
        showToast('Correo no válido. Usa @educa.madrid.org', 'error');
        return;
    }

    if (email === 'rafael.casais@educa.madrid.org') {
        document.getElementById('adminSection').style.display = 'block';
        showToast('Bienvenido, administrador', 'success');
    } else if (approvedEmails.includes(email)) {
        showToast(`Bienvenido, ${email}`, 'success');
    } else {
        showToast('Correo no autorizado', 'error');
        return;
    }

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

export async function fetchApprovedEmails() {
    try {
        const response = await fetch('https://api.github.com/gists/YOUR_GIST_ID');
        const data = await response.json();
        approvedEmails = JSON.parse(data.files['approvedEmails.json'].content);
        localStorage.setItem('approvedEmails', JSON.stringify(approvedEmails));
    } catch (error) {
        showToast('Error al cargar correos aprobados', 'error');
    }
}