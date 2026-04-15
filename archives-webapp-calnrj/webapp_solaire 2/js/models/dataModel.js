import { Emitter } from '../utils/emitter.js';
import { parseHCIntervals } from '../utils/classify.js';

export class DataModel extends Emitter{
  constructor(){
    super();
    this.params = {
      priceBase: 0.2069,
      priceHP: 0.2520,
      priceHC: 0.2060,
      fixedBase: 12.50,
      fixedHPHC: 14.00,
      hcIntervals: ['22:00-06:00']
    };
    this.hcParsed = parseHCIntervals(this.params.hcIntervals);
    this.consumption = { minutes: 15, data: [] }; // {t:Date,kwh}
    this.production = { minutes: 15, data: [] };
    this.period = { type:'all' };
  }
  setParams(p){
    this.params = { ...this.params, ...p };
    this.hcParsed = parseHCIntervals(this.params.hcIntervals);
    this.emit('params-updated');
  }
  setConsumption(ds){ this.consumption = ds; this.emit('data-updated'); }
  setProduction(ds){ this.production = ds; this.emit('data-updated'); }
  setPeriod(period){ this.period = period; this.emit('params-updated'); }
}
