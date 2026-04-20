export function parseDate(s){
  if(!s) return null;
  const str = String(s).trim();
  // ISO
  const dISO = new Date(str);
  if(!isNaN(dISO)) return dISO;
  // French common formats: DD/MM/YYYY HH:mm[:ss]
  const m = str.match(/^(\d{1,2})[\/](\d{1,2})[\/]?(\d{2,4})?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(m){
    const DD = parseInt(m[1],10);
    const MM = parseInt(m[2],10)-1;
    let YYYY = m[3]? parseInt(m[3],10): (new Date()).getFullYear();
    if(YYYY<100) YYYY += 2000;
    const hh = parseInt(m[4],10);
    const mm = parseInt(m[5],10);
    const ss = m[6]? parseInt(m[6],10):0;
    return new Date(YYYY,MM,DD,hh,mm,ss);
  }
  // DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[\/](\d{1,2})[\/]?(\d{2,4})$/);
  if(dmy){
    const DD = parseInt(dmy[1],10);
    const MM = parseInt(dmy[2],10)-1;
    let YYYY = dmy[3]? parseInt(dmy[3],10): (new Date()).getFullYear();
    if(YYYY<100) YYYY += 2000;
    return new Date(YYYY,MM,DD);
  }
  return null;
}

export function detectIntervalMinutes(dates){
  if(dates.length<2) return 15;
  const deltas = [];
  for(let i=1;i<dates.length;i++){
    const dt = (dates[i] - dates[i-1]) / 60000;
    if(isFinite(dt) && dt>0) deltas.push(Math.round(dt));
  }
  if(deltas.length===0) return 15;
  // Use mode of deltas
  const freq = {};
  deltas.forEach(d=> freq[d] = (freq[d]||0)+1);
  const best = Object.entries(freq).sort((a,b)=> b[1]-a[1])[0][0];
  return parseInt(best,10);
}

export function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function monthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
export function getYear(d){ return d.getFullYear(); }
export function getMonth(d){ return d.getMonth()+1; }
export function getDay(d){ return d.getDate(); }
export function hoursOfDay(d){ return d.getHours()+ d.getMinutes()/60 + d.getSeconds()/3600; }
