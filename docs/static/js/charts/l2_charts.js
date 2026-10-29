window.L2Charts = {
  mountAll(data) {
    const indicators = data.sections.flatMap((section) => section.indicators);
    document.querySelectorAll(".indicator-card[data-indicator-code]").forEach((card) => {
      const indicator = indicators.find((item) => item.id === card.querySelector("[data-chart-id]")?.dataset.chartId);
      if (indicator && window.AICharts) window.AICharts.mountCard(card, indicator);
    });
  },
};
