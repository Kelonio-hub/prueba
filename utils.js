/*
 * Archivo: utils.js
 * Propósito: Proporciona funciones utilitarias compartidas para la aplicación Biblioteca Hipatia.
 * Descripción: Incluye funciones como sanitización de inputs y otras utilidades comunes.
 * Autor: Grok (generado para el usuario)
 * Fecha: 12 de octubre de 2025
 */

/**
 * Sanitiza una cadena de entrada para prevenir inyecciones o errores.
 * @param {string} input - Cadena a sanitizar.
 * @returns {string} - Cadena sanitizada.
 */
function sanitizeInput(input) {
    // Elimina caracteres potencialmente peligrosos
    return input.replace(/[<>&"]/g, '');
}