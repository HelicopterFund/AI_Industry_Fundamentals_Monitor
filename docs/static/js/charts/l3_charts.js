window.L3Charts = {
  mountAll(data) {
    const indicators = data.sections.flatMap((section) => section.indicators);
    document.querySelectorAll(".indicator-card[data-indicator-code]").forEach((card) => {
      const shell = card.querySelector("[data-chart-id]");
      const indicator = indicators.find((item) => item.id === shell?.dataset.chartId);
      if (indicator && window.AICharts) window.AICharts.mountCard(card, indicator);
    });
  },
};
