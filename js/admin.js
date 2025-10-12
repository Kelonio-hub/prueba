import { reservas, prestamos, marcarRecogido, devolverLibro } from './reservations.js';
import { approvedEmails, fetchApprovedEmails } from './auth.js';
import { catalogo } from './catalog.js';
import { showToast, formatDate, sanitizeInput } from './utils.js';

export let solicitudes = JSON.parse(localStorage.getItem('solicitudes')) || [];
export let reseñas = JSON.parse(localStorage.getItem('reseñas')) || [];

export function renderAdminTasks() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <h3>Tareas Pendientes</h3>
        <table>
            <thead>
                <tr><th>Usuario</th><th>Libro</th><th>Fecha</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${reservas
                    .filter(r => r.estado === 'pendiente')
                    .map(r => {
                        const libro = catalogo.find(l => l.isbn === r.isbn);
                        return `
                            <tr>
                                <td>${r.email}</td>
                                <td>${libro?.titulo || 'No encontrado'}</td>
                                <td>${formatDate(r.fecha)}</td>
                                <td>
                                    <button onclick="marcarRecogido('${r.isbn}', '${r.email}')">Recogido</button>
                                    <button onclick="cancelarReserva('${r.isbn}', '${r.email}')">Cancelar</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
            </tbody>
        </table>
    `;
}

export function renderAdminHistory() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <h3>Historial</h3>
        <table>
            <thead>
                <tr><th>Usuario</th><th>Libro</th><th>Préstamo</th><th>Devolución</th></tr>
            </thead>
            <tbody>
                ${prestamos.map(p => {
                    const libro = catalogo.find(l => l.isbn === p.isbn);
                    return `
                        <tr>
                            <td>${p.email}</td>
                            <td>${libro?.titulo || 'No encontrado'}</td>
                            <td>${formatDate(p.fechaPrestamo)}</td>
                            <td>${p.fechaDevolucion ? formatDate(p.fechaDevolucion) : 'Pendiente'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <button id="exportCSV">Exportar a CSV</button>
    `;
}

export function renderApprovedEmails() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <h3>Correos Aprobados</h3>
        <input type="text" id="emailSearch" placeholder="Buscar correo">
        <input type="file" id="emailFile" accept=".csv,.xlsx">
        <table>
            <thead>
                <tr><th>Correo</th><th>Acciones</th></tr>
            </thead>
            <tbody id="emailTable">
                ${approvedEmails.map(email => `
                    <tr>
                        <td>${email}</td>
                        <td><button onclick="eliminarCorreo('${email}')">Eliminar</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

export function cancelarReserva(isbn, email) {
    const reservaIndex = reservas.findIndex(r => r.isbn === isbn && r.email === email);
    if (reservaIndex === -1) {
        showToast('Reserva no encontrada', 'error');
        return;
    }

    const libro = catalogo.find(l => l.isbn === isbn);
    if (libro) libro.disponible = true;
    reservas.splice(reservaIndex, 1);
    localStorage.setItem('reservas', JSON.stringify(reservas));
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
    showToast('Reserva cancelada', 'success');
    renderAdminTasks();
}

export function eliminarCorreo(email) {
    const index = approvedEmails.indexOf(email);
    if (index !== -1) {
        approvedEmails.splice(index, 1);
        localStorage.setItem('approvedEmails', JSON.stringify(approvedEmails));
        showToast('Correo eliminado', 'success');
        renderApprovedEmails();
    }
}

export function exportHistoryToCSV() {
    const csv = [
        'Usuario,Libro,Fecha Préstamo,Fecha Devolución',
        ...prestamos.map(p => {
            const libro = catalogo.find(l => l.isbn === p.isbn);
            return `${p.email},${libro?.titulo || 'No encontrado'},${formatDate(p.fechaPrestamo)},${p.fechaDevolucion ? formatDate(p.fechaDevolucion) : ''}`;
        })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial_prestamos.csv';
    a.click();
    URL.revokeObjectURL(url);
}