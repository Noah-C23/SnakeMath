// Navigation Menu
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");

hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("active");
    });
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href");
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            window.scrollTo({
                top: targetSection.offsetTop - 60,
                behavior: "smooth"
            });
        }
    });
});

// Navbar scroll effect
window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});
// Contact form submission
const form = document.getElementById("contactForm");
const formMessage = document.getElementById("formMessage");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const action = form.getAttribute("action");

    fetch(action, {
        method: "POST",
        body: formData,
        headers: { 'Accept': 'application/json' }
    })
        .then(response => {
            if (response.ok) {
                formMessage.style.display = "block";
                formMessage.textContent = "✅ Message sent successfully!";
                form.reset();
            } else {
                formMessage.style.display = "block";
                formMessage.textContent = "❌ Something went wrong. Try again later.";
            }
        })
        .catch(() => {
            formMessage.style.display = "block";
            formMessage.textContent = "❌ Something went wrong. Try again later.";
        });
});

