// Detect units (W, Wh, kWh). If unknown, assume Watts (instantaneous power) and convert using interval.
export function detectUnitsAndConvert(records, minutes){
  const intervalHours = minutes/60;
  const out = [];
  for(const r of records){
    const u = String(r.unit||'').toLowerCase();
    let kwh = null;
    if(u.includes('kwh')){
      kwh = Number(r.v);
    } else if(u.includes('wh')){
      kwh = Number(r.v)/1000;
    } else if(u.includes('w')){
      kwh = Number(r.v) * intervalHours / 1000; // W * h => Wh => kWh
    } else {
      // try to infer by magnitude: if value > 50 likely watts for 15/30min; else could be kWh
      if(Number(r.v) > 50) kwh = Number(r.v) * intervalHours / 1000; else kwh = Number(r.v); // assume it's already kWh
    }
    out.push({ t: r.t, kwh, raw: r.v });
  }
  return out;
}
