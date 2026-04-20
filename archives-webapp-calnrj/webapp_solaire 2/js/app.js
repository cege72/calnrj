// Bootstrapping
import { ThemeController } from './controllers/themeController.js';
import { SettingsController } from './controllers/settingsController.js';
import { SummaryController } from './controllers/summaryController.js';
import { ConsumptionController } from './controllers/consumptionController.js';
import { ProductionController } from './controllers/productionController.js';
import { DataModel } from './models/dataModel.js';

const state = new DataModel();

// Tab router
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
tabs.forEach(btn => btn.addEventListener('click', () => {
  tabs.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const id = btn.dataset.tab;
  views.forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
}));

// Controllers
new ThemeController();
const settings = new SettingsController(state);
const summary = new SummaryController(state);
const consumption = new ConsumptionController(state);
const production = new ProductionController(state, consumption);

// Cross updates
state.on('data-updated', () => {
  summary.render();
  consumption.render();
  production.render();
});
state.on('params-updated', () => {
  summary.render();
  consumption.render();
  production.render();
});

// Initial render
settings.init();
summary.init();
consumption.init();
production.init();

window.addEventListener("resize", ()=>{ summary.render(); consumption.render(); production.render(); });
