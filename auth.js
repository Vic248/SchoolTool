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
        if (!user || !user.app_metadata.roles.includes(role)) {
            return true;
        }
    });
}

// ============================
// Gestion du menu latéral
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("menu-btn"); // bouton pour ouvrir/fermer
    const sidebar = document.getElementById("menu"); // ton menu latéral

    if (toggleBtn && sidebar) {
        // Ouvrir / fermer via bouton
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("open");
        });

        // Fermer si clic en dehors
        document.addEventListener("click", (e) => {
            if (
                sidebar.classList.contains("open") &&
                !sidebar.contains(e.target) &&
                e.target !== toggleBtn
            ) {
                sidebar.classList.remove("open");
            }
        });
    }
});
