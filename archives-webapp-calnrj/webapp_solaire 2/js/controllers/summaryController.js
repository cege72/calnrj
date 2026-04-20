import { aggregateHPHC, filterByPeriod, yearsAvailable } from '../utils/stats.js';
import { pieChart } from '../views/charts.js';

export class SummaryController{
  constructor(state){ this.state = state; }
  init(){
    this.initSelectors();
    this.render();
  }
  initSelectors(){
    const periodSel = document.getElementById('period-select');
    const yearWrap = document.getElementById('year-select-wrap');
    const monthWrap = document.getElementById('month-select-wrap');
    const yearSel = document.getElementById('year-select');
    const monthSel = document.getElementById('month-select');

    const updateYears = ()=>{
      const ys = yearsAvailable(this.state.consumption.data);
      yearSel.innerHTML = ys.map(y=>`<option value="${y}">${y}</option>`).join('');
      monthSel.innerHTML = Array.from({length:12}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    };
    updateYears();

    const apply = ()=>{
      const p = periodSel.value;
      if(p==='all'){ yearWrap.classList.add('hidden'); monthWrap.classList.add('hidden'); this.state.setPeriod({ type:'all' }); }
      if(p==='year'){ yearWrap.classList.remove('hidden'); monthWrap.classList.add('hidden'); this.state.setPeriod({ type:'year', year: Number(yearSel.value) }); }
      if(p==='month'){ yearWrap.classList.remove('hidden'); monthWrap.classList.remove('hidden'); this.state.setPeriod({ type:'month', year: Number(yearSel.value), month: Number(monthSel.value) }); }
    };

    periodSel.addEventListener('change', apply);
    yearSel.addEventListener('change', apply);
    monthSel.addEventListener('change', apply);

    this.state.on('data-updated', updateYears);
  }
  render(){
    const data = filterByPeriod(this.state.consumption.data, this.state.period);
    const { hp, hc } = aggregateHPHC(data, this.state.hcParsed);

    pieChart(document.getElementById('pie-hphc'), [
      { label:'HP', value: hp, color:'#ef4444' },
      { label:'HC', value: hc, color:'#10b981' }
    ]);

    const total = hp+hc;
    document.getElementById('kpi-total').textContent = `${total.toFixed(2)} kWh`;

    const months = Math.max(1, monthsBetween(data));
    const billBase = total * this.state.params.priceBase + months * this.state.params.fixedBase;
    const billHPHC = hp * this.state.params.priceHP + hc * this.state.params.priceHC + months * this.state.params.fixedHPHC;
    const savings = billBase - billHPHC;

    document.getElementById('kpi-bill-base').textContent = formatEuro(billBase);
    document.getElementById('kpi-bill-hphc').textContent = formatEuro(billHPHC);
    document.getElementById('kpi-savings').textContent = `${savings>=0? '+':''}${formatEuro(savings)}`;

    const sig = document.getElementById('kpi-signal');
    sig.innerHTML = '';
    const badge = document.createElement('span');
    badge.className = 'badge ' + (savings>10? 'ok': (savings>=0? 'warn': 'err'));
    badge.textContent = savings>10? '✅ Économies' : (savings>=0? '🟠 Économies faibles' : '⛔️ Pas rentable');
    sig.appendChild(badge);
  }
}

function monthsBetween(data){
  if(data.length===0) return 0;
  const first = data[0].t; const last = data[data.length-1].t;
  return Math.max(1, (last.getFullYear()-first.getFullYear())*12 + (last.getMonth()-first.getMonth()) + 1);
}
function formatEuro(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n); }
