/*
 * Archivo: main.js
 * Propósito: Inicializa la aplicación Biblioteca Hipatia y coordina los módulos.
 * Descripción: Configura el tema inicial, inicializa los módulos (libros, gamificación, admin) y maneja eventos globales.
 * Autor: Grok (generado para el usuario)
 * Fecha: 12 de octubre de 2025
 */

/**
 * Inicializa la aplicación cuando el DOM está listo.
 * Carga el tema guardado y llama a las funciones de inicialización de los módulos.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Configurar tema inicial desde localStorage o usar 'theme-light' por defecto
    const theme = localStorage.getItem('theme') || 'theme-light';
    document.body.className = theme;

    // Inicializar módulos
    initBooks(); // Configura la sección de búsqueda y gestión de libros
    initGamification(); // Configura la sección de gamificación
    initAdmin(); // Configura el panel de administración
});