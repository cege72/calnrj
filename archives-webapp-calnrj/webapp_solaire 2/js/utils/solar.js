// NOAA-like solar position to compute sunrise, sunset, day length, and a simple clear-sky energy proxy.
const DEG2RAD = Math.PI/180, RAD2DEG = 180/Math.PI;

export function solarForDates(dates, lat, lon, tiltDeg, powerW){
  const latR = lat*DEG2RAD;
  const tilt = tiltDeg*DEG2RAD;
  const dayLength = [], sunriseHour=[], sunsetHour=[], energyDaily=[];
  for(const d of dates){
    const n = dayOfYear(d);
    const dec = declination(n);
    const EoT = equationOfTime(n); // minutes
    const lngHour = lon/15;
    // Approx solar noon offset (in hours)
    const solarNoon = 12 + (lngHour* -1) - (EoT/60);
    const cosH = (Math.cos(90.833*DEG2RAD) - Math.sin(latR)*Math.sin(dec)) / (Math.cos(latR)*Math.cos(dec));
    let H = Math.acos(Math.min(1, Math.max(-1, cosH)))*RAD2DEG/15; // hours
    if(isNaN(H)) H = lat>0? (dec>0? 12:0) : (dec<0? 12:0); // polar
    const sr = solarNoon - H;
    const ss = solarNoon + H;
    const dl = Math.max(0, (ss - sr));
    dayLength.push(dl);
    sunriseHour.push(mod24(sr));
    sunsetHour.push(mod24(ss));
    // Simple energy proxy: clear-sky daily insolation ~ k * dl * cos(|lat-dec-tilt|)
    const cosInc = Math.max(0, Math.cos(Math.abs(latR - dec - tilt)));
    const k = 0.2; // scaling to get kWh for ~3kW over a day length
    energyDaily.push(k * dl * cosInc * (powerW/1000));
  }
  return { dayLength, sunriseHour, sunsetHour, energyDaily };
}

function mod24(x){ while(x<0) x+=24; while(x>=24) x-=24; return x; }

function dayOfYear(d){
  const start = new Date(d.getFullYear(),0,0); const diff = d - start; return Math.floor(diff/86400000);
}
function declination(n){ // solar declination in radians
  return 23.44*DEG2RAD * Math.sin(DEG2RAD * (360/365*(n-81)));
}
function equationOfTime(n){ // minutes, approximation
  const B = DEG2RAD * (360/365*(n-81));
  return 9.87*Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B);
}
