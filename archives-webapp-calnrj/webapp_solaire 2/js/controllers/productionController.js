import { filterByPeriod } from '../utils/stats.js';
import { lineChartDual } from '../views/charts.js';
import { solarForDates } from '../utils/solar.js';

export class ProductionController{
  constructor(state, consumptionCtrl){ this.state=state; this.consCtrl = consumptionCtrl; }
  init(){
    this.form = document.getElementById('form-solar');
    this.latEl = document.getElementById('lat');
    this.lonEl = document.getElementById('lon');
    this.cityInput = document.getElementById('city-search');
    this.powerEl = document.getElementById('pv-power');
    this.tiltEl = document.getElementById('tilt');
    this.overlayChk = document.getElementById('overlay-real-theory');
    this.info = document.getElementById('solar-info');

    document.getElementById('btn-geo').addEventListener('click',()=>{
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition((pos)=>{
          this.latEl.value = pos.coords.latitude.toFixed(6);
          this.lonEl.value = pos.coords.longitude.toFixed(6);
        }, ()=>{ this.info.textContent = 'Géolocalisation refusée.'; });
      }
    });

    fetch('data/cities_fr.json').then(r=>r.json()).then(list=>{
      this.cities = list;
      this.cityInput.addEventListener('input', ()=>{
        const q = this.cityInput.value.toLowerCase();
        const c = this.cities.find(c=> c.name.toLowerCase().startsWith(q));
        if(c){ this.latEl.value=c.lat; this.lonEl.value=c.lon; }
      });
    });

    this.form.addEventListener('submit', (e)=>{ e.preventDefault(); this.render(); });
    this.overlayChk.addEventListener('change', ()=> this.render());
  }
  render(){
    const prodData = filterByPeriod(this.state.production.data, this.state.period);
    const consData = filterByPeriod(this.state.consumption.data, this.state.period);

    const realByDay = aggregateByDay(prodData);
    let days = Object.keys(realByDay).sort();
    if(days.length===0){
      const consDays = Object.keys(aggregateByDay(consData)).sort();
      days = consDays.length? consDays : defaultDaysForPeriod(this.state.period);
    }

    const lat = Number(this.latEl.value||'48.006');
    const lon = Number(this.lonEl.value||'0.199');
    const tilt = Number(this.tiltEl.value||'30');
    const power = Number(this.powerEl.value||'3000');

    const theory = solarForDates(days.map(d=> new Date(d+'T12:00:00')), lat, lon, tilt, power);

    const cats = days.map(d=> d.slice(5));
    const series = [
      { name:'Durée jour (h)', data: theory.dayLength, axis:'left' },
      { name:'Lever (h)', data: theory.sunriseHour, axis:'right' },
      { name:'Coucher (h)', data: theory.sunsetHour, axis:'right' },
    ];

    lineChartDual(document.getElementById('solar-chart'), series, cats, ['#f59e0b','#3b82f6','#ef4444']);

    const realVals = days.map(d=> realByDay[d]||0);
    const cont = document.getElementById('prod-real-chart');
    cont.innerHTML='';
    const w = cont.clientWidth || 600, h = cont.clientHeight || 260; const pad=30, bpad=40; const innerW = w-pad-10, innerH=h-pad-bpad;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('width','100%'); svg.setAttribute('height',h);
    const max = Math.max(1, ...realVals, ...theory.energyDaily);
    const path=[]; const path2=[];
    for(let i=0;i<realVals.length;i++){
      const x = pad + i*innerW/Math.max(1,realVals.length-1);
      const y = pad + innerH - (realVals[i]/max)*innerH;
      path.push(`${i===0?'M':'L'} ${x} ${y}`);
      const y2 = pad + innerH - ((theory.energyDaily[i]||0)/max)*innerH;
      path2.push(`${i===0?'M':'L'} ${x} ${y2}`);
    }
    const axis = document.createElementNS('http://www.w3.org/2000/svg','line'); axis.setAttribute('x1',pad); axis.setAttribute('y1',h-bpad); axis.setAttribute('x2',w-10); axis.setAttribute('y2',h-bpad); axis.setAttribute('stroke','currentColor'); axis.setAttribute('stroke-opacity','.3'); svg.appendChild(axis);
    const p = document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d', path.join(' ')); p.setAttribute('fill','none'); p.setAttribute('stroke','#10b981'); p.setAttribute('stroke-width','2'); svg.appendChild(p);
    if(this.overlayChk.checked){
      const p2 = document.createElementNS('http://www.w3.org/2000/svg','path'); p2.setAttribute('d', path2.join(' ')); p2.setAttribute('fill','none'); p2.setAttribute('stroke','#f59e0b'); p2.setAttribute('stroke-width','2'); svg.appendChild(p2);
    }
    cont.appendChild(svg);
    this.info.textContent = `Coord: ${lat.toFixed(3)}, ${lon.toFixed(3)} — Tilt ${tilt}°, Pc ${power} W — Jour min/max: ${Math.min(...theory.dayLength).toFixed(1)}h / ${Math.max(...theory.dayLength).toFixed(1)}h`;
  }
}

function aggregateByDay(data){
  const by = {};
  data.forEach(r=>{
    const k = `${r.t.getFullYear()}-${String(r.t.getMonth()+1).padStart(2,'0')}-${String(r.t.getDate()).padStart(2,'0')}`;
    by[k] = (by[k]||0) + r.kwh;
  });
  return by;
}

function defaultDaysForPeriod(period){
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth()+1;
  if(period.type==='year'){ y = period.year; m = 6; }
  if(period.type==='month'){ y = period.year; m = period.month; }
  const daysInMonth = new Date(y,m,0).getDate();
  return Array.from({length:daysInMonth}, (_,i)=> `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
}
