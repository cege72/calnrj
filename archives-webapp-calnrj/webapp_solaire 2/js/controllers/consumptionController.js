import { aggregateHPHC, filterByPeriod, yearsAvailable } from '../utils/stats.js';
import { stackedBars } from '../views/charts.js';

export class ConsumptionController{
  constructor(state){ this.state = state; this.mode='year'; this.currentYear=null; this.currentMonth=null; }
  init(){
    this.yearSel = document.getElementById('cons-year-select');
    this.monthSel = document.getElementById('cons-month-select');
    this.chartTitle = document.getElementById('cons-chart-title');
    this.backWrap = document.getElementById('btn-back-month-wrap');
    document.getElementById('btn-back-month').addEventListener('click',()=>{ this.mode='year'; this.render(); });
    this.yearSel.addEventListener('change',()=>{ this.mode='year'; this.currentYear = Number(this.yearSel.value); this.state.setPeriod({ type:'year', year:this.currentYear }); this.render(); });
    this.monthSel.addEventListener('change',()=>{ if(this.mode==='year'){ this.mode='month'; } this.currentMonth=Number(this.monthSel.value); this.state.setPeriod({ type:'month', year:this.currentYear, month:this.currentMonth }); this.render(); });
    this.state.on('data-updated', ()=> this.refreshSelectors());
    this.refreshSelectors();
  }
  refreshSelectors(){
    const ys = yearsAvailable(this.state.consumption.data);
    this.yearSel.innerHTML = ys.map(y=>`<option value="${y}">${y}</option>`).join('');
    if(this.currentYear===null) this.currentYear = ys[0]|| new Date().getFullYear();
    this.yearSel.value = this.currentYear;
    this.monthSel.innerHTML = Array.from({length:12},(_,i)=>`<option value=${i+1}>${i+1}</option>`).join('');
  }
  render(){
    const data = this.state.consumption.data;
    const hcInt = this.state.hcParsed;
    if(data.length===0){ document.getElementById('bar-monthly').innerHTML='<p class="muted">Importer des données pour afficher ce graphique.</p>'; return; }

    if(this.mode==='year'){
      // aggregate by month for the selected year or all years
      const period = this.state.period.type==='all'? {type:'year',year:this.currentYear} : this.state.period;
      const filtered = filterByPeriod(data, period);
      const { byMonth } = aggregateHPHC(filtered, hcInt);
      const months = Array.from({length:12},(_,i)=> i+1);
      const cats = months.map(m=> String(m));
      const hp = months.map(m=> sumMonth(byMonth, period.year, m, 'hp'));
      const hc = months.map(m=> sumMonth(byMonth, period.year, m, 'hc'));
      // PV self-consumption if available
      const pvEnabled = this.state.production.data.length>0;
      const pv = months.map(m=> sumMonthPV(this.state, period.year, m));
      document.getElementById('pv-label').classList.toggle('hidden', !pvEnabled);

      stackedBars(document.getElementById('bar-monthly'), [
        { name:'PV autoconsommée', data: pvEnabled? pv: months.map(()=>0) },
        { name:'HC', data: hc },
        { name:'HP', data: hp },
      ], cats, ['#22c55e','#10b981','#ef4444'], {
        onBarClick: (i)=>{ this.mode='month'; this.currentMonth=i+1; this.state.setPeriod({ type:'month', year: period.year, month: this.currentMonth }); this.render(); }
      });
      this.chartTitle.textContent = 'Consommation mensuelle (kWh) — empilé HP/HC' + (pvEnabled? ' + PV autoconsommée':'');
      this.backWrap.classList.add('hidden');
    } else {
      const period = { type:'month', year:this.currentYear, month:this.currentMonth };
      const filtered = filterByPeriod(data, period);
      const { byDay } = aggregateHPHC(filtered, hcInt);
      const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
      const cats = Array.from({length:daysInMonth},(_,i)=> String(i+1));
      const hp = cats.map((d,i)=> sumDay(byDay, this.currentYear, this.currentMonth, i+1, 'hp'));
      const hc = cats.map((d,i)=> sumDay(byDay, this.currentYear, this.currentMonth, i+1, 'hc'));
      const pvEnabled = this.state.production.data.length>0;
      const pv = cats.map((d,i)=> sumDayPV(this.state, this.currentYear, this.currentMonth, i+1));

      stackedBars(document.getElementById('bar-monthly'), [
        { name:'PV autoconsommée', data: pvEnabled? pv: cats.map(()=>0) },
        { name:'HC', data: hc },
        { name:'HP', data: hp },
      ], cats, ['#22c55e','#10b981','#ef4444']);
      this.chartTitle.textContent = `Détails jour par jour — ${this.currentMonth}/${this.currentYear}`;
      this.backWrap.classList.remove('hidden');
    }
  }
}

function sumMonth(byMonth, year, month, key){
  const k = `${year}-${String(month).padStart(2,'0')}`; return byMonth[k]? byMonth[k][key]||0 : 0;
}
function sumDay(byDay, year, month, day, key){
  const k = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`; return byDay[k]? byDay[k][key]||0 : 0;
}
function sumMonthPV(state, year, month){
  // compute PV self-cons by month
  const byMonth = state._pvMonthCache || (state._pvMonthCache={});
  const k = `${year}-${String(month).padStart(2,'0')}`;
  const cons = state.consumption.data.filter(r=> r.t.getFullYear()===year && (r.t.getMonth()+1)===month);
  const prod = state.production.data.filter(r=> r.t.getFullYear()===year && (r.t.getMonth()+1)===month);
  if(prod.length===0) return 0;
  const map = new Map(prod.map(p=> [p.t.getTime(), p.kwh]));
  let s=0; cons.forEach(c=>{ s += Math.min(c.kwh, map.get(c.t.getTime())||0); });
  return s;
}
function sumDayPV(state, year, month, day){
  const cons = state.consumption.data.filter(r=> r.t.getFullYear()===year && (r.t.getMonth()+1)===month && r.t.getDate()===day);
  const prod = state.production.data.filter(r=> r.t.getFullYear()===year && (r.t.getMonth()+1)===month && r.t.getDate()===day);
  if(prod.length===0) return 0;
  const map = new Map(prod.map(p=> [p.t.getTime(), p.kwh]));
  let s=0; cons.forEach(c=>{ s += Math.min(c.kwh, map.get(c.t.getTime())||0); });
  return s;
}
