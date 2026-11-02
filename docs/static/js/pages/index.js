document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".report-entry-card[data-href]").forEach((card) => {
    const navigate = () => { window.location.href = card.dataset.href; };
    card.addEventListener("click", (event) => {
      if (!event.target.closest("a")) navigate();
    });
    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a")) {
        event.preventDefault();
        navigate();
      }
    });
  });
});
