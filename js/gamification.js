import { showToast, formatDate } from './utils.js';

export let userProgress = JSON.parse(localStorage.getItem('userProgress')) || {};

const niveles = [
    { nombre: 'Lector Iniciado', minPuntos: 0 },
    { nombre: 'Lector Aventurero', minPuntos: 100 },
    { nombre: 'Lector Experto', minPuntos: 250 },
    { nombre: 'Maestro de la Biblioteca', minPuntos: 500 }
];

export function addPoints(email, action, points) {
    email = sanitizeInput(email);
    if (!userProgress[email]) {
        userProgress[email] = { puntos: 0, nivel: niveles[0].nombre, acciones: [] };
    }

    userProgress[email].puntos += points;
    userProgress[email].acciones.push({ accion: action, puntos: points, fecha: new Date().toISOString() });

    // Actualizar nivel
    const nuevoNivel = niveles.slice().reverse().find(n => userProgress[email].puntos >= n.minPuntos);
    if (nuevoNivel && userProgress[email].nivel !== nuevoNivel.nombre) {
        userProgress[email].nivel = nuevoNivel.nombre;
        showToast(`¡Subiste a ${nuevoNivel.nombre}!`, 'success');
    }

    localStorage.setItem('userProgress', JSON.stringify(userProgress));
}

export function renderProgreso(email) {
    const progreso = userProgress[email] || { puntos: 0, nivel: niveles[0].nombre, acciones: [] };
    const content = document.getElementById('progresoContent');
    content.innerHTML = `
        <h3>Progreso de ${email}</h3>
        <p>Nivel: ${progreso.nivel}</p>
        <p>Puntos: ${progreso.puntos}</p>
        <progress value="${progreso.puntos}" max="${niveles.find(n => n.nombre === progreso.nivel).minPuntos + 100}"></progress>
        <h4>Historial de Acciones</h4>
        <ul>
            ${progreso.acciones.map(a => `
                <li>${a.accion}: ${a.puntos} puntos (${formatDate(a.fecha)})</li>
            `).join('')}
        </ul>
    `;
}