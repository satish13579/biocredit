function Home(x) {
    document.getElementById("Home").classList.remove("active");
    document.getElementById("Explore").classList.remove("active");
    document.getElementById("About").classList.remove("active");
    x.classList.add("active");
}

const overlay = document.querySelector("#overlay");
const mainNav = document.querySelector("#offcanvas");
const navToggle = document.querySelector("#fa");
const navClose = document.querySelector("#fa-cross");

function closeCanvas() {
    navClose.style.display = "none";
    navToggle.style.display = "block";
    if (mainNav.classList.contains("is-active")) {
        mainNav.classList.remove("is-active");
    }
    if (overlay.classList.contains("is-active"))
        overlay.classList.remove("is-active");
}

navToggle.addEventListener("click", () => {
    navClose.style.display = "block";
    navToggle.style.display = "none";
    if (!mainNav.classList.contains("is-active")) {
        mainNav.classList.add("is-active");
    }
    if (!overlay.classList.contains("is-active"))
        overlay.classList.add("is-active");
});
navClose.addEventListener("click", () => {
    navClose.style.display = "none";
    navToggle.style.display = "block";
    if (mainNav.classList.contains("is-active")) {
        mainNav.classList.remove("is-active");
    }
    if (overlay.classList.contains("is-active"))
        overlay.classList.remove("is-active");
});

overlay.addEventListener("click", () => {
    if (mainNav.classList.contains("is-active"))
        mainNav.classList.remove("is-active");
    if (overlay.classList.contains("is-active"))
        overlay.classList.remove("is-active");
    navClose.style.display = "none";
    navToggle.style.display = "block";
});