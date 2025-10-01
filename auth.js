// Initialisation Netlify Identity
if (typeof netlifyIdentity !== "undefined") {
    netlifyIdentity.init();

    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const userInfo = document.getElementById("user-info");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => netlifyIdentity.open());
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => netlifyIdentity.logout());
    }

    // Quand l'utilisateur se connecte
    netlifyIdentity.on("login", (user) => {
        console.log("Connecté :", user.email);
        if (loginBtn) loginBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
        if (userInfo) userInfo.innerText = `Bonjour, ${user.user_metadata.full_name || user.email}`;
        netlifyIdentity.close();
    });

    // Quand l'utilisateur se déconnecte
    netlifyIdentity.on("logout", () => {
        console.log("Déconnecté");
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (userInfo) userInfo.innerText = "";
    });

    // Si déjà connecté au chargement
    netlifyIdentity.on("init", (user) => {
        if (user) {
            if (loginBtn) loginBtn.style.display = "none";
            if (logoutBtn) logoutBtn.style.display = "inline-block";
            if (userInfo) userInfo.innerText = `Bonjour, ${user.user_metadata.full_name || user.email}`;
        }
    });
}

// Fonction pour protéger une page
function requireLogin() {
    netlifyIdentity.on("init", (user) => {
        if (!user) {
            alert("Vous devez être connecté pour accéder à cette page.");
            window.location.href = "/";
        }
    });
}

function requireRole(role) {
    netlifyIdentity.on("init", (user) => {
        if (!user || !user.app_metadata.roles.includes(role)) {
            alert(`Vous devez être ${role} pour accéder à cette page.`);
            window.location.href = "/";
        }
    });
}

function ifRole(role) {
    netlifyIdentity.on("init", (user) => {
        if (user || user.app_metadata.roles.includes(role)) {
            alert(`Vous devez être normal pour accéder à ce site.`);
            window.location.href = "google.com";
        }
    });
}