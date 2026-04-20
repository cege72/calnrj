import { hoursOfDay } from './time.js';

export function parseHCIntervals(list){
  // list like ["22:00-06:00","12:30-14:30"] => array of [startHour,endHour] in decimal; supports wrap past midnight
  return list.map(s=> s.trim()).filter(Boolean).map(s=>{
    const m = s.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if(!m) return null;
    const sh = parseInt(m[1],10) + parseInt(m[2],10)/60;
    const eh = parseInt(m[3],10) + parseInt(m[4],10)/60;
    return [sh, eh];
  }).filter(Boolean);
}

export function isHC(date, intervals){
  if(!intervals || intervals.length===0) return false;
  const h = hoursOfDay(date);
  for(const [sh,eh] of intervals){
    if(sh<=eh){ // same day
      if(h>=sh && h<eh) return true;
    } else { // wraps past midnight
      if(h>=sh || h<eh) return true;
    }
  }
  return false;
}
