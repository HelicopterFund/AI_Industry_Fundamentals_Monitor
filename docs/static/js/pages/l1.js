(() => {
  const dataNode = document.getElementById("page-data");
  if (!dataNode || !window.L1Charts) return;
  const data = JSON.parse(dataNode.textContent);
  const indicators = data.sections.flatMap((section) => section.indicators);
  window.L1Charts.mountAll(data);
  document.querySelectorAll("[data-expand-chart]").forEach((button) => {
    button.addEventListener("click", () => {
      const indicator = indicators.find((item) => item.id === button.dataset.expandChart);
      if (indicator && window.AICharts) window.AICharts.openModal(indicator);
    });
  });
  const sections = [...document.querySelectorAll("[data-section-id]")];
  const links = [...document.querySelectorAll(".sidebar-section")];
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) links.forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`));
  }), { rootMargin: "-18% 0px -68% 0px" });
  sections.forEach((section) => observer.observe(section));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelector("[data-chart-modal]")?._close?.(); });
})();
