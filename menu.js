function loadMenu() {
    fetch("/menu.json")
        .then(response => response.json())
        .then(menuLinks => {
            const menuContainer = document.createElement("div");
            menuContainer.id = "menu";

            menuLinks.forEach(link => {
                const a = document.createElement("a");
                a.href = link.href;
                a.setAttribute("onmouseenter", `mouseEnter('${link.id}')`);
                a.setAttribute("onmouseleave", `mouseLeave('${link.id}')`);

                const i = document.createElement("i");
                i.className = link.icon;
                i.id = link.id;

                a.appendChild(i);
                a.appendChild(document.createTextNode(" " + link.text));

                menuContainer.appendChild(a);
            });

            document.body.appendChild(menuContainer);

            // === Ajout de la logique ouverture/fermeture ===
            const toggleBtn = document.getElementById("menu-toggle"); // bouton qui ouvre le menu
            if (toggleBtn) {
                toggleBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    menuContainer.classList.toggle("open");
                });
            }

            // Fermer si clic à l'extérieur
            document.addEventListener("click", (e) => {
                if (
                    menuContainer.classList.contains("open") &&
                    !menuContainer.contains(e.target) &&
                    e.target !== toggleBtn
                ) {
                    menuContainer.classList.remove("open");
                }
            });
        })
        .catch(error => console.error("Erreur de chargement du menu :", error));
}