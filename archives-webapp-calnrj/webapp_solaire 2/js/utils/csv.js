// Very small CSV parser (supports ; or , as separators)
export function parseCSV(text){
  const sep = text.indexOf(';')>-1 && (text.indexOf(',')===-1 || text.split('
')[0].split(';').length>=text.split('
')[0].split(',').length) ? ';' : ',';
  const lines = text.replace(//g,'').split('
').filter(l=>l.trim().length);
  if(lines.length===0) return { headers:[], rows:[] };
  const headers = splitLine(lines[0], sep);
  const rows = lines.slice(1).map(l => splitLine(l, sep));
  return { headers, rows };
}
function splitLine(line, sep){
  const out=[]; let cur=''; let inq=false; for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"') { inq=!inq; continue; }
    if(ch===sep && !inq){ out.push(cur); cur=''; } else { cur+=ch; }
  }
  out.push(cur); return out.map(s=>s.trim());
}
