window.L3Charts = {
  mountAll(data) {
    document.querySelectorAll("[data-chart-id]").forEach((element) => {
      const indicator = data.sections.flatMap((section) => section.indicators)
        .find((item) => item.id === element.dataset.chartId);
      if (indicator && window.AICharts) window.AICharts.renderPlaceholder(element, indicator);
    });
  },
};
