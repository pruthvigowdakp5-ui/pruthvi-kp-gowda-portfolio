const menuToggle = document.querySelector(".menu-toggle");
const navigationLinks = document.querySelector(".navigation-links");
const contactForm = document.querySelector("#contact-form");
const formFeedback = document.querySelector("#form-feedback");

if (contactForm instanceof HTMLFormElement && formFeedback) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);
    const subject = `Portfolio message from ${formData.get("name")}`;
    const body = [
      `Name: ${formData.get("name")}`,
      `Email: ${formData.get("email")}`,
      "",
      formData.get("message")
    ].join("\n");
    const mailto = `mailto:pruthvigowdakp5@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    formFeedback.textContent = "Your email app should open with the message ready to send.";
    formFeedback.classList.remove("is-error");
    window.location.href = mailto;
  });

  contactForm.addEventListener("input", () => {
    formFeedback.textContent = "";
    formFeedback.classList.remove("is-error");
  });
}

function closeMenu() {
  if (!menuToggle || !navigationLinks) return;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  navigationLinks.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

if (menuToggle && navigationLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navigationLinks.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigationLinks.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640) closeMenu();
  });
}

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const profilePhoto = document.querySelector(".profile-photo");
if (profilePhoto) {
  profilePhoto.addEventListener("load", () => {
    profilePhoto.classList.add("is-loaded");
  }, { once: true });

  profilePhoto.addEventListener("error", () => {
    profilePhoto.hidden = true;
  }, { once: true });

  if (profilePhoto.complete && profilePhoto.naturalWidth > 0) {
    profilePhoto.classList.add("is-loaded");
  }
}
