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

            // ADD THIS: Attach the event listener after menu is in DOM
            const menuBtn = document.getElementById("menu-btn");
            if (menuBtn) {
                menuBtn.addEventListener("click", function () {
                    menuContainer.classList.toggle("open");
                });
            }
        })
        .catch(error => console.error("Erreur de chargement du menu :", error));
}