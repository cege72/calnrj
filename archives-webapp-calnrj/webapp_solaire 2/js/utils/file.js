import { parseCSV } from './csv.js';
import { parseDate, detectIntervalMinutes } from './time.js';
import { detectUnitsAndConvert } from './units.js';

export async function importFile(file){
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith('.csv');
  const isXLS = name.endsWith('.xls') || name.endsWith('.xlsx');

  if(isCSV){
    const text = await file.text();
    return parseTable(text);
  } else if(isXLS){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (e)=>{
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type:'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header:1, raw:true });
        const headers = json[0].map(h=>String(h));
        const rows = json.slice(1).map(r=> r.map(c=> (c===undefined? '': String(c)) ));
        resolve(processTable({ headers, rows }));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  } else {
    throw new Error('Format non supporté');
  }
}

function parseTable(text){
  const parsed = parseCSV(text);
  return processTable(parsed);
}

function processTable({ headers, rows }){
  // Normalize headers
  const H = headers.map(h=>h.trim().toLowerCase());
  const idxTime = findIndex(H, ['time','timestamp','date','datetime','horodatage','heure','jour','date/heure']);
  const idxVal = findIndex(H, ['value','valeur','consommation','puissance','energy','énergie','kwh','wh','w']);
  const idxUnit = findIndex(H, ['unit','unité','units']);

  if(idxTime===-1 || idxVal===-1){
    throw new Error('Colonnes non trouvées: horodatage et valeur sont requis.');
  }
  const records = [];
  for(const r of rows){
    const t = parseDate(r[idxTime]);
    if(!t) continue;
    const v = Number(String(r[idxVal]).replace(',','.'));
    if(!isFinite(v)) continue;
    const unit = idxUnit>-1 ? String(r[idxUnit]).toLowerCase() : '';
    records.push({ t, v, unit });
  }
  if(records.length===0) throw new Error('Aucune ligne valide.');

  // Detect interval and convert to kWh
  const minutes = detectIntervalMinutes(records.map(r=>r.t));
  const converted = detectUnitsAndConvert(records, minutes);
  return { minutes, data: converted };
}

function findIndex(arr, keys){
  for(const k of keys){
    const i = arr.findIndex(h=> h.includes(k));
    if(i>-1) return i;
  }
  return -1;
}
