// Overrides + CSV preview + pie % labels + solar support
const $ = (sel) => document.querySelector(sel);
const fmtEuro = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const fmtNum = (n, d=3) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n, d=1) => (n).toLocaleString('fr-FR', { style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d });

// Params & HC
function loadParams(){ try{ const p=JSON.parse(localStorage.getItem('hp_hc_params')||'{}'); ['prix_base','prix_hc','prix_hp','abo_base','abo_hphc'].forEach(id=>{$('#'+id).value=p[id]??''}); $('#ref_time').value=p.ref_time??'mid'; const hcList=$('#hc-list'); hcList.innerHTML=''; (p.plages_hc||[{debut:'22:30',fin:'06:30'}]).forEach(addHcRow);}catch{}}
function addHcRow(v){ const row=document.createElement('div'); row.className='hc-row'; row.innerHTML=`<label>Début <input type="time" value="${v?.debut||''}"/></label><label>Fin <input type="time" value="${v?.fin||''}"/></label><button class="sec" type="button">Supprimer</button>`; row.querySelector('button').onclick=()=>row.remove(); $('#hc-list').appendChild(row);} 
function collectParams(){ const plages=[...document.querySelectorAll('.hc-row')].map(r=>({debut:r.querySelectorAll('input')[0].value,fin:r.querySelectorAll('input')[1].value})).filter(p=>p.debut&&p.fin); const g=id=>parseFloat(($('#'+id).value||'').replace(',','.'))||0; return {prix_base:g('prix_base'),prix_hc:g('prix_hc'),prix_hp:g('prix_hp'),abo_base:g('abo_base'),abo_hphc:g('abo_hphc'),ref_time:$('#ref_time').value||'mid',plages_hc:plages}; }
$('#btn-add-hc')?.addEventListener('click',()=>addHcRow()); $('#btn-save')?.addEventListener('click',()=>{localStorage.setItem('hp_hc_params',JSON.stringify(collectParams())); alert('Paramètres sauvegardés ✔');}); $('#btn-clear')?.addEventListener('click',()=>{localStorage.removeItem('hp_hc_params'); location.reload();});
loadParams();

// CSV parsing & preview
function normalizeHeader(h){ return h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
function detectDelimiter(line){ const count=(ch,str)=> (str.match(new RegExp(ch,'g'))||[]).length; const sc=count(';',line), cc=count(',',line), tc=count('\t',line); if(sc>=tc&&sc>=cc) return ';'; if(tc>=sc&&tc>=cc) return '\t'; return ','; }
function splitCSVLine(line,delim){ return line.split(delim).map(s=>s.trim()); }
function asNumberFR(s){ if(s==null) return NaN; s=(''+s).replace(/\s/g,'').replace(',','.'); return parseFloat(s); }

function parseCSVWithMeta(text){
  const lines = text.split(/\r?\n/).filter(l=>l.length>0);
  if(!lines.length) return {headers:[],rows:[],meta:'',unit:null,pasMin:null,rawLines:[]};
  let headerIdx=0; let delim=detectDelimiter(lines[0]); let unit=null, pasMin=null;
  for(let i=0;i<Math.min(80,lines.length);i++){
    const d=detectDelimiter(lines[i]); const parts=splitCSVLine(lines[i],d); const norm=parts.map(normalizeHeader).join(';');
    if(/;unite;/i.test(lines[i])){ const m=lines[i].match(/;Unite;([^;\n]*)/i); if(m) unit=(m[1]||'').trim(); }
    if(/;Pas en minutes;/i.test(lines[i])){ const m=lines[i].match(/;Pas en minutes;([^;\n]*)/i); if(m) pasMin=parseInt((m[1]||'').trim(),10); }
    if(norm==='horodate;valeur' || norm==='date;heure' || norm.includes('kwh') || norm.includes('wh') || norm.includes('kw')){ headerIdx=i; delim=d; break; }
  }
  const rawHeaders = splitCSVLine(lines[headerIdx],delim); const headers=rawHeaders.map(normalizeHeader);
  const rows=[]; for(let i=headerIdx+1;i<lines.length;i++){ const parts=splitCSVLine(lines[i],delim); if(parts.length<2) continue; const obj={}; for(let j=0;j<rawHeaders.length;j++){ obj[headers[j]]=parts[j]||''; } rows.push(obj); }
  return {headers,rows,meta:lines.slice(0,headerIdx).join('\n'),unit,pasMin, rawLines: lines.slice(headerIdx, headerIdx+1+Math.min(10, rows.length+1))};
}

function renderPreview(container, parsed){
  const wrap = $(container); if(!parsed || !parsed.headers || parsed.headers.length===0){ wrap.innerHTML=''; return; }
  let html = '<div class="muted" style="margin-bottom:4px">Aperçu des premières lignes :</div><table><thead><tr>';
  parsed.headers.forEach(h=>{ html += `<th>${h}</th>`; }); html += '</tr></thead><tbody>';
  for(let i=0;i<Math.min(5, parsed.rows.length); i++){
    html += '<tr>'; parsed.headers.forEach(h=>{ html += `<td>${parsed.rows[i][h]||''}</td>`; }); html += '</tr>';
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function transformData(parsed, forced){
  const H=parsed.headers; const idx=(n)=>H.indexOf(n);
  const iHorodate=idx('horodate'); const iValeur=idx('valeur'); const iDate=idx('date'); const iHeure=Math.max(idx('heure'),idx('time'),idx('hour'),idx('heures')); const iKwh=Math.max(idx('energie (kwh)'),idx('énergie (kwh)'),idx('kwh'),idx('energie')); const iWh=Math.max(idx('wh'),idx('wattheure'),idx('watt-heures')); const iDebut=Math.max(idx('dateheure de debut'),idx('dateheure de début')); const iFin=Math.max(idx('datehaure de fin'),idx('dateheure de fin')); const iKW=Math.max(idx('valeur (en kw)'), idx('kw'));
  const rows=parsed.rows; let data=[]; let diag={format:'', unit: forced.unit||parsed.unit||'', pas: forced.step||parsed.pasMin||null, stepMin:null, count:0, first:null, last:null};

  if(iHorodate>=0 && iValeur>=0){
    const pts = rows.map(r=>({t:new Date(r['horodate']), v:asNumberFR(r['valeur'])})).filter(p=>!isNaN(p.t)&&isFinite(p.v)).sort((a,b)=>a.t-b.t);
    if(pts.length<2) throw new Error('Pas assez de points Horodate/Valeur');
    const diffs=[]; for(let i=1;i<pts.length;i++){ diffs.push((pts[i].t-pts[i-1].t)/60000); }
    const med = diffs.sort((a,b)=>a-b)[Math.floor(diffs.length/2)] || 15;
    const stepMin = forced.step || parsed.pasMin || med; const dhDefault = stepMin/60;
    const unit = (forced.unit || parsed.unit || '').toUpperCase();
    for(let i=1;i<pts.length;i++){
      const start=pts[i-1].t, end=pts[i].t; const dh=((end-start)/3600000)||dhDefault; let kwh;
      if(unit==='W') kwh=(pts[i].v*dh)/1000.0; else if(unit==='WH') kwh=pts[i].v/1000.0; else if(unit==='KWH') kwh=pts[i].v; else if(unit==='KW') kwh=pts[i].v*dh; else { kwh=(pts[i].v>=50? pts[i].v/1000.0 : pts[i].v); }
      data.push({start,end,kwh});
    }
    diag.format='Horodate;Valeur'; diag.stepMin=Math.round(stepMin); diag.count=data.length; diag.first=pts[0].t; diag.last=pts[pts.length-1].t;
    return {data, diag};
  }

  if(iDebut>=0 && iFin>=0 && iKW>=0){
    const pts=rows.map(r=>({s:new Date((r[H[iDebut]]||'').replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3-$2-$1')), e:new Date((r[H[iFin]]||'').replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3-$2-$1')), kw:asNumberFR(r[H[iKW]])})).filter(p=>!isNaN(p.s)&&!isNaN(p.e)&&isFinite(p.kw)).sort((a,b)=>a.s-b.s);
    pts.forEach(p=>{ const dh=(p.e-p.s)/3600000; data.push({start:p.s,end:p.e,kwh:p.kw*dh}); });
    const stepMin = pts.length>1? Math.round((pts[1].e-pts[1].s)/60000):null; diag.format='Début/Fin/kW'; diag.unit='kW'; diag.stepMin=stepMin; diag.count=data.length; diag.first=pts[0]?.s||null; diag.last=pts[pts.length-1]?.e||null; return {data, diag};
  }

  if(iDate>=0 && iHeure>=0 && (iKwh>=0||iWh>=0)){
    const pts=rows.map(r=>{ const dt=new Date(r['date'].replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3-$2-$1')+' '+r[H[iHeure]]); let kwh=NaN; if(iKwh>=0) kwh=asNumberFR(r[H[iKwh]]); else kwh=asNumberFR(r[H[iWh]])/1000.0; return {t:dt,kwh}; }).filter(p=>!isNaN(p.t)&&isFinite(p.kwh)).sort((a,b)=>a.t-b.t);
    const stepMin = forced.step || 60; for(let i=0;i<pts.length;i++){ const start=pts[i].t; const end=new Date(start.getTime()+stepMin*60000); data.push({start,end,kwh:pts[i].kwh}); }
    diag.format='Date/Heure/kWh|Wh'; diag.unit=(iWh>=0?'Wh':'kWh'); diag.stepMin=stepMin; diag.count=data.length; diag.first=pts[0]?.t||null; diag.last=pts[pts.length-1]?.t||null; return {data, diag};
  }
  throw new Error('Format non reconnu.');
}

function diagLine(name, d){ if(!d) return `${name}: —\n`; const f=(dt)=> dt? new Date(dt).toLocaleString('fr-FR'): '—'; return `${name}: format=${d.format}, unité=${d.unit||'auto'}, pas≈${d.stepMin||'auto'} min, points=${d.count}, début=${f(d.first)}, fin=${f(d.last)}`; }

// Overrides state
const OV = {
  import: { unit: '', step: null },
  export: { unit: '', step: null },
  pv:     { unit: '', step: null },
};
['import','export','pv'].forEach(kind=>{
  $('#ov-unit-'+kind)?.addEventListener('change', e=>{ OV[kind].unit = e.target.value || ''; });
  $('#ov-step-'+kind)?.addEventListener('input', e=>{ const v=parseInt(e.target.value,10); OV[kind].step = (isFinite(v) && v>0)? v : null; });
});

// File handlers + previews + diagnostics
let DATA_IMPORT=null, DATA_EXPORT=null, DATA_PV=null; let DIAG_IMPORT=null, DIAG_EXPORT=null, DIAG_PV=null;

async function handleFile(inputSel, kind){ const el=$(inputSel); if(!el.files?.length){ setData(kind,null,null); updateDiag(); recompute(); return; } const text=await el.files[0].text(); const parsed=parseCSVWithMeta(text); renderPreview('#preview-'+kind, parsed); const forced={ unit: (OV[kind].unit||''), step: (OV[kind].step||null) }; const {data,diag}=transformData(parsed, forced); setData(kind, data, diag); updateDiag(); recompute(); }

function setData(kind, data, diag){ if(kind==='import'){ DATA_IMPORT=data; DIAG_IMPORT=diag; } else if(kind==='export'){ DATA_EXPORT=data; DIAG_EXPORT=diag; } else { DATA_PV=data; DIAG_PV=diag; } }

$('#file-import')?.addEventListener('change', ()=>handleFile('#file-import','import'));
$('#file-export')?.addEventListener('change', ()=>handleFile('#file-export','export'));
$('#file-pv')?.addEventListener('change', ()=>handleFile('#file-pv','pv'));

function updateDiag(){ const lines=[]; lines.push(diagLine('Consommation (import)', DIAG_IMPORT)); lines.push(diagLine('Injection (export)', DIAG_EXPORT)); lines.push(diagLine('Production PV', DIAG_PV)); $('#import_diag').textContent = lines.join('\n'); }

// HC test
function toTimeNumber(d){ return d.getHours()/24 + d.getMinutes()/1440 + d.getSeconds()/86400; }
function parseTimeStr(hhmm){ const [h,m]=(hhmm||'0:0').split(':').map(x=>parseInt(x||'0',10)); return h/24 + (m||0)/1440; }
function inHC(t,ranges){ for(const [s,e] of ranges){ if(s<=e){ if(t>=s&&t<e) return true; } else { if(t>=s||t<e) return true; } } return false; }

// Aggregations
const MONTHS_FR=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const ym=(d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const label=(k)=>{const [y,mm]=k.split('-');return `${MONTHS_FR[parseInt(mm,10)-1]} ${y}`};
function aggImportHPHC(records){ const p=collectParams(); const ranges=(p.plages_hc||[]).map(x=>[parseTimeStr(x.debut),parseTimeStr(x.fin)]); const ref=p.ref_time; const map=new Map(); let sumHP=0,sumHC=0; (records||[]).forEach(rec=>{ const t=(ref==='start')?rec.start:(ref==='end'?rec.end:new Date((rec.start.getTime()+rec.end.getTime())/2)); const key=ym(rec.start); const b=map.get(key)||{hp:0,hc:0}; if(inHC(toTimeNumber(t),ranges)){ b.hc+=rec.kwh; sumHC+=rec.kwh; } else { b.hp+=rec.kwh; sumHP+=rec.kwh; } map.set(key,b);}); return {map,sumHP,sumHC}; }
function aggSimple(records){ const m=new Map(); let tot=0; (records||[]).forEach(r=>{ const k=ym(r.start); m.set(k,(m.get(k)||0)+r.kwh); tot+=r.kwh; }); return {map:m,total:tot}; }

// Colors
const COLOR_HC='#16a34a', COLOR_HP='#2563eb', COLOR_PV='#f59e0b';

// Pie with % labels
function renderPie(elem,hc,hp){ const total=Math.max(1e-9,hc+hp); const vals=[hc,hp]; const labels=['HC','HP']; const cols=[COLOR_HC,COLOR_HP]; const r=110,cx=120,cy=120; let ang=-Math.PI/2; let svg=`<svg width="240" height="240" viewBox="0 0 240 240">`;
  vals.forEach((v,i)=>{ const a2=ang+(v/total)*2*Math.PI; const x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang); const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2); const large=(a2-ang)>Math.PI?1:0; svg+=`<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${cols[i]}" />`; // label
    const mid=(ang+a2)/2; const rx=cx+(r*0.6)*Math.cos(mid), ry=cy+(r*0.6)*Math.sin(mid); const pct = (v/total); const pctText = (pct*100).toFixed(0)+'%'; svg+=`<text x="${rx}" y="${ry}" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="13" font-weight="600">${pctText}</text>`; ang=a2; }); svg+='</svg>'; elem.innerHTML = svg; }
function renderPieLegend(container,hc,hp){ const total=Math.max(1e-9,hc+hp); container.innerHTML=''; const mk=(color,label,val)=>{ const pct = (val/total); const div=document.createElement('div'); div.className='chip'; div.innerHTML=`<span class="dot" style="background:${color}"></span><span>${label}</span><strong>${(pct*100).toFixed(0)}% · ${fmtNum(val,1)} kWh</strong>`; return div; }; container.appendChild(mk(COLOR_HC,'Heures Creuses',hc)); container.appendChild(mk(COLOR_HP,'Heures Pleines',hp)); }

// Bars (HP/HC + PV auto)
function drawStackedBars(elem, months){ const n=months.length; const margin={t:20,r:16,b:70,l:64}; const w=Math.max(420,n*60+margin.l+margin.r); const h=340; const maxV=Math.max(1,...months.map(m=>m.totalLoad)); const ih=h-margin.t-margin.b; const iw=w-margin.l-margin.r; const barW=Math.max(24,Math.min(56,Math.floor(iw/Math.max(1,n*1.08)))); const gap=Math.max(10,Math.floor(barW*0.22)); const scaleY=(v)=> margin.t+ih-(v/maxV)*ih; let svg=`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`; for(let i=0;i<=4;i++){ const v=(maxV*i/4); const y=scaleY(v); svg+=`<line x1="${margin.l}" y1="${y}" x2="${w-margin.r}" y2="${y}" stroke="#e5edf5"/>`; svg+=`<text x="${margin.l-10}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="#627d98" font-size="11">${v.toFixed(0)}</text>`;} svg+=`<line x1="${margin.l}" y1="${margin.t+ih}" x2="${w-margin.r}" y2="${margin.t+ih}" stroke="#9fb3c8"/>`; let x=margin.l+8; const yB=margin.t+ih; months.forEach(m=>{ const hpH=yB-scaleY(m.hp); const hcH=yB-scaleY(m.hp+m.hc)-(yB-scaleY(m.hp)); const pvH=yB-scaleY(m.totalLoad)-(yB-scaleY(m.hp+m.hc)); const yHP=yB-hpH, yHC=yHP-hcH, yPV=yHC-pvH; svg+=`<rect x="${x}" y="${yHP}" width="${barW}" height="${hpH}" rx="3" fill="${COLOR_HP}"><title>${m.label}\nHP: ${m.hp.toFixed(3)} kWh\nHC: ${m.hc.toFixed(3)} kWh\nPV auto: ${m.pv_auto.toFixed(3)} kWh\nCharge: ${m.totalLoad.toFixed(3)} kWh\nPV couvre ${(m.totalLoad>0?(m.pv_auto/m.totalLoad*100):0).toFixed(0)}%</title></rect>`; svg+=`<rect x="${x}" y="${yHC}" width="${barW}" height="${hcH}" rx="3" fill="${COLOR_HC}"/>`; svg+=`<rect x="${x}" y="${yPV}" width="${barW}" height="${pvH}" rx="3" fill="${COLOR_PV}"/>`; svg+=`<text x="${x+barW/2}" y="${h-26}" text-anchor="middle" fill="#334e68" font-size="11">${m.label}</text>`; x+=barW+gap;}); elem.innerHTML=svg+'</svg>'; }
function renderStackedLegend(container){ container.innerHTML=''; const mk=(c,t)=>{const d=document.createElement('div'); d.className='chip'; d.innerHTML=`<span class="dot" style="background:${c}"></span><span>${t}</span>`; return d;}; container.appendChild(mk(COLOR_HP,'Heures Pleines (HP)')); container.appendChild(mk(COLOR_HC,'Heures Creuses (HC)')); container.appendChild(mk(COLOR_PV,'PV autoconsommée')); }

// Recompute
function recompute(){ if(!DATA_IMPORT){ $('#results').classList.add('hidden'); $('#no-data').classList.remove('hidden'); return; } const p=collectParams(); const imp=aggImportHPHC(DATA_IMPORT); const exp=aggSimple(DATA_EXPORT||[]); const pv=aggSimple(DATA_PV||[]); const SUM_HP=imp.sumHP, SUM_HC=imp.sumHC; const TOT_IMPORT=SUM_HP+SUM_HC, TOT_EXPORT=exp.total, TOT_PV=pv.total; const PV_AUTO=Math.max(0, TOT_PV - TOT_EXPORT); const LOAD=Math.max(0, TOT_PV + TOT_IMPORT - TOT_EXPORT); const pv_share=LOAD>0? PV_AUTO/LOAD : 0; $('#tot_import').textContent=fmtNum(TOT_IMPORT,3)+' kWh'; $('#tot_pv').textContent=(TOT_PV>0?fmtNum(TOT_PV,3)+' kWh':'—'); $('#tot_export').textContent=(TOT_EXPORT>0?fmtNum(TOT_EXPORT,3)+' kWh':'—'); $('#tot_pv_auto').textContent=(PV_AUTO>0?fmtNum(PV_AUTO,3)+' kWh':'—'); $('#tot_load').textContent=(LOAD>0?fmtNum(LOAD,3)+' kWh':'—'); $('#pv_share').textContent=(LOAD>0?fmtPct(pv_share):'—'); renderPie($('#pie'), SUM_HC, SUM_HP); renderPieLegend($('#pie_legend'), SUM_HC, SUM_HP); // abos
  let minDate=DATA_IMPORT[0].start, maxDate=DATA_IMPORT[DATA_IMPORT.length-1].start; const jours=minDate&&maxDate? Math.floor((new Date(maxDate.toDateString())-new Date(minDate.toDateString()))/86400000)+1:0; const mois=jours>0? (jours/30.0):0; const cout_base=TOT_IMPORT*p.prix_base; const cout_hphc=SUM_HC*p.prix_hc + SUM_HP*p.prix_hp; const tot_base_abos=cout_base + (p.abo_base||0)*mois; const tot_hphc_abos=cout_hphc + (p.abo_hphc||0)*mois; $('#tot_base_abos').textContent = fmtEuro(tot_base_abos); $('#tot_hphc_abos').textContent = fmtEuro(tot_hphc_abos); $('#eco_abos').textContent = fmtEuro(tot_base_abos - tot_hphc_abos);
  // Monthly rows
  const impMap=imp.map, expMap=exp.map||new Map(), pvMap=pv.map||new Map(); const allKeys=[...new Set([ ...impMap.keys(), ...expMap.keys(), ...pvMap.keys() ])].sort(); const years=[...new Set(allKeys.map(k=>parseInt(k.split('-')[0],10)))].sort((a,b)=>a-b); const sel=$('#year_select'); sel.innerHTML=''; const oAll=document.createElement('option'); oAll.value=''; oAll.textContent='Toutes'; sel.appendChild(oAll); years.forEach(y=>{const o=document.createElement('option'); o.value=String(y); o.textContent=String(y); sel.appendChild(o);}); sel.onchange=()=>refreshMonthly(impMap,expMap,pvMap); refreshMonthly(impMap,expMap,pvMap); $('#results').classList.remove('hidden'); $('#no-data').classList.add('hidden'); $('#btn-export').onclick=()=>exportCSV(DATA_IMPORT, DATA_EXPORT, DATA_PV); }

function refreshMonthly(impMap,expMap,pvMap){ const yearSel=$('#year_select').value; const yr=yearSel?parseInt(yearSel,10):null; const rows=[]; [...new Set([ ...impMap.keys(), ...expMap.keys(), ...pvMap.keys() ])].sort().forEach(k=>{ const y=parseInt(k.split('-')[0],10); if(yr&&y!==yr) return; const hp=(impMap.get(k)?.hp)||0, hc=(impMap.get(k)?.hc)||0, pv=pvMap.get(k)||0, ex=expMap.get(k)||0; const pv_auto=Math.max(0, pv-ex); const totalLoad=Math.max(0, pv + hp + hc - ex); rows.push({key:k,label:label(k),hp,hc,pv_auto,totalLoad,pv,exp:ex}); }); drawStackedBars($('#monthly_chart'), rows); renderStackedLegend($('#bar_legend')); $('#btn-export-monthly').onclick=()=>{ let csv='mois;kWh_HP;kWh_HC;kWh_PV_auto;kWh_PV_total;kWh_export;kWh_charge_total;%PV_sur_charge\n'; rows.forEach(m=>{ const pct=m.totalLoad>0? Math.round(m.pv_auto/m.totalLoad*100):0; csv += `${m.label};${m.hp.toFixed(3).replace('.',',')};${m.hc.toFixed(3).replace('.',',')};${m.pv_auto.toFixed(3).replace('.',',')};${m.pv.toFixed(3).replace('.',',')};${m.exp.toFixed(3).replace('.',',')};${m.totalLoad.toFixed(3).replace('.',',')};${pct}\n`;}); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`mensuel_hp_hc_pv${yr?('_'+yr):''}.csv`; a.click(); URL.revokeObjectURL(url); }; }

function exportCSV(importRows, exportRows, pvRows){ const header=['type','start','end','kWh']; const toCSV=(v)=>{ if(v==null) return ''; if(v instanceof Date) return v.toISOString(); if(typeof v==='number') return (''+v).replace('.',','); return '"'+String(v).replaceAll('"','""')+'"'; }; let csv=header.join(';')+'\n'; (importRows||[]).forEach(r=>{ csv += ['import', r.start, r.end, r.kwh].map(toCSV).join(';')+'\n'; }); (exportRows||[]).forEach(r=>{ csv += ['export', r.start, r.end, r.kwh].map(toCSV).join(';')+'\n'; }); (pvRows||[]).forEach(r=>{ csv += ['pv', r.start, r.end, r.kwh].map(toCSV).join(';')+'\n'; }); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='donnees_calculees_hp_hc_pv.csv'; a.click(); URL.revokeObjectURL(url); }
