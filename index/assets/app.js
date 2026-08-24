(() => {
  "use strict";

  function setupNavigation() {
    const links = Array.from(document.querySelectorAll(".main-nav a"));
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-38% 0px -56%", threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }

  function setupReveals() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "120px 0px", threshold: 0.06 });

    items.forEach((item) => observer.observe(item));
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  setupNavigation();
  setupReveals();
})();
