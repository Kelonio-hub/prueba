import { catalogo } from './catalog.js';
import { showToast, formatDate, sanitizeInput } from './utils.js';

export let reservas = JSON.parse(localStorage.getItem('reservas')) || [];
export let prestamos = JSON.parse(localStorage.getItem('prestamos')) || [];

export function reservarLibro(isbn, email) {
    isbn = sanitizeInput(isbn);
    email = sanitizeInput(email);

    // Validar límite de reservas (máximo 3 por usuario)
    if (reservas.filter(r => r.email === email).length >= 3) {
        showToast('Límite de 3 reservas alcanzado', 'error');
        return false;
    }

    // Buscar libro en el catálogo
    const libro = catalogo.find(l => l.isbn === isbn);
    if (!libro) {
        showToast('Libro no encontrado', 'error');
        return false;
    }

    // Verificar disponibilidad
    if (!libro.disponible) {
        showToast('El libro no está disponible', 'error');
        return false;
    }

    // Crear reserva
    const reserva = {
        isbn,
        email,
        fecha: new Date().toISOString(),
        estado: 'pendiente'
    };
    reservas.push(reserva);
    libro.disponible = false;
    localStorage.setItem('reservas', JSON.stringify(reservas));
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
    showToast(`Reserva de "${libro.titulo}" realizada`, 'success');
    return true;
}

export function marcarRecogido(isbn, email) {
    const reserva = reservas.find(r => r.isbn === isbn && r.email === email && r.estado === 'pendiente');
    if (!reserva) {
        showToast('Reserva no encontrada', 'error');
        return false;
    }

    reserva.estado = 'recogido';
    prestamos.push({
        isbn,
        email,
        fechaPrestamo: new Date().toISOString(),
        fechaDevolucion: null
    });
    localStorage.setItem('reservas', JSON.stringify(reservas));
    localStorage.setItem('prestamos', JSON.stringify(prestamos));
    showToast('Libro marcado como recogido', 'success');
    return true;
}

export function devolverLibro(isbn, email) {
    const prestamo = prestamos.find(p => p.isbn === isbn && p.email === email && !p.fechaDevolucion);
    if (!prestamo) {
        showToast('Préstamo no encontrado', 'error');
        return false;
    }

    const libro = catalogo.find(l => l.isbn === isbn);
    if (!libro) {
        showToast('Libro no encontrado', 'error');
        return false;
    }

    prestamo.fechaDevolucion = new Date().toISOString();
    libro.disponible = true;
    localStorage.setItem('prestamos', JSON.stringify(prestamos));
    localStorage.setItem('catalogo', JSON.stringify(catalogo));
    showToast(`"${libro.titulo}" devuelto`, 'success');
    return true;
}