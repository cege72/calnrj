import { monthKey, ymd, getYear, getMonth, getDay } from './time.js';
import { isHC } from './classify.js';

export function aggregateHPHC(data, hcIntervals){
  let hp=0, hc=0; const byMonth={}, byDay={};
  for(const r of data){
    const mk = monthKey(r.t); const dk = ymd(r.t);
    const inHC = isHC(r.t, hcIntervals);
    const val = r.kwh;
    if(inHC) hc += val; else hp += val;
    if(!byMonth[mk]) byMonth[mk] = { hp:0, hc:0 };
    if(!byDay[dk]) byDay[dk] = { hp:0, hc:0 };
    if(inHC){ byMonth[mk].hc += val; byDay[dk].hc += val; }
    else { byMonth[mk].hp += val; byDay[dk].hp += val; }
  }
  return { hp, hc, byMonth, byDay };
}

export function aggregatePVSelf(consumption, production){
  // assumes both arrays of {t, kwh}; compute self-consumed per slot by matching timestamps (rounded to same minutes)
  if(!production || production.length===0) return { byMonth:{}, byDay:{}, total:0 };
  const pMap = new Map();
  for(const p of production){ pMap.set(p.t.getTime(), p.kwh); }
  let total=0; const byMonth={}, byDay={};
  for(const c of consumption){
    const tms = c.t.getTime();
    const pv = pMap.has(tms)? pMap.get(tms): 0;
    const sc = Math.min(c.kwh, pv);
    total += sc;
    const mk = monthKey(c.t); const dk = ymd(c.t);
    if(!byMonth[mk]) byMonth[mk] = 0; byMonth[mk]+=sc;
    if(!byDay[dk]) byDay[dk] = 0; byDay[dk]+=sc;
  }
  return { byMonth, byDay, total };
}

export function sumRange(arr){ return arr.reduce((a,b)=>a+b,0); }

export function filterByPeriod(data, period){
  if(period.type==='all') return data;
  return data.filter(r=>{
    const y = r.t.getFullYear();
    const m = r.t.getMonth()+1;
    if(period.type==='year') return y===period.year;
    if(period.type==='month') return y===period.year && m===period.month;
    return true;
  });
}

export function yearsAvailable(data){
  const ys = new Set(data.map(r=> r.t.getFullYear()));
  return Array.from(ys).sort((a,b)=>a-b);
}
