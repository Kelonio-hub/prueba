let catalogo = [];
let reservas = {};
let prestamos = {};
let solicitudes = [];
let reseñas = []; // Ahora incluye idRegistro, titulo y rating
let approvedEmails = [];
let emailSesion = null;
const EMAIL_ADMIN = 'rafael.casais@educa.madrid.org';
const ANNO_ACTUAL = '2025';
let sortColumn = 'fechaReserva';
let sortDirection = 'desc';
let sortColumnEmails = 'email';
let sortDirectionEmails = 'asc';
let currentPageHistorial = 1;
let currentPageEmails = 1;
let currentPageSolicitudes = 1;
let currentPageSearch = 1;
let searchResults = [];
let searchQuery = '';
// Config Gist
const GIST_ID = '8b8017695492cf0a07215b7a5410072c';
const GIST_FILENAME = 'approved-emails.json';
// Nuevas variables para colores personalizados
let customColors = {};
const defaultColors = {
    'bg-primary': '#f4f4f4',
    'bg-secondary': '#ffffff',
    'text-primary': '#333333',
    'text-secondary': '#666666',
    'btn-primary': '#007bff',
    'border-color': '#dddddd',
    'btn-flotante-bg': '#ffffff',
    'btn-flotante-color': '#000000',
    'btn-flotante-hover-bg': '#f3f4f6',
    'bot-msg-color': '#333333'
};
// Gamificación: Progreso por usuario
let userProgress = {};
const niveles = [
    { nombre: 'Lector Iniciado', min: 0, max: 99, icon: '🔍' },
    { nombre: 'Lector Explorador', min: 100, max: 299, icon: '🗺️' },
    { nombre: 'Aventurero de Páginas', min: 300, max: 599, icon: '📖' },
    { nombre: 'Guardián de Historias', min: 600, max: 999, icon: '👑' },
    { nombre: 'Maestro de la Biblioteca', min: 1000, max: Infinity, icon: '🦉' }
];