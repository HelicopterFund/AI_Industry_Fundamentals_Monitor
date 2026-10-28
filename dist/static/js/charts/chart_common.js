// Chart adapter boundary: add ECharts, Observable Plot, or another renderer here later.
window.AICharts = window.AICharts || {
  renderPlaceholder(element) {
    element.dataset.chartReady = "true";
  },
};
