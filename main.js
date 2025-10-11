function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function login() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email.endsWith('@educa.madrid.org')) {
        document.getElementById('loginError').style.display = 'block';
        return;
    }
    document.getElementById('loginError').style.display = 'none';

    // Mostrar splash al iniciar sesión
    const splash = document.getElementById('splash');
    const loginSection = document.getElementById('loginSection');
    splash.classList.remove('hidden');
    loginSection.style.display = 'none';

    // Esperar 3 segundos y luego mostrar app principal
    setTimeout(() => {
        splash.classList.add('hidden');
        document.getElementById('app').style.display = 'block';
    }, 3000);
}