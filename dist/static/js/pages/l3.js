(() => {
  const dataNode = document.getElementById("page-data");
  if (!dataNode || !window.L3Charts) return;
  const data = JSON.parse(dataNode.textContent);
  window.L3Charts.mountAll(data);

  const sections = [...document.querySelectorAll("[data-section-id]")];
  const links = [...document.querySelectorAll(".sidebar-section")];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-18% 0px -68% 0px" });
  sections.forEach((section) => observer.observe(section));
})();
