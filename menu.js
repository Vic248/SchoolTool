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
        })
        .catch(error => console.error("Erreur de chargement du menu :", error));
}

document.getElementById("menu-btn").addEventListener("click", function () {
    document.getElementById("menu").classList.toggle("open");    
});

function mouseEnter(id) {
    const newId = document.getElementById(id);
    newId.classList.add('fa-bounce');
}
    
function mouseLeave(id) {
    const newId = document.getElementById(id);
    newId.classList.remove('fa-bounce');
}