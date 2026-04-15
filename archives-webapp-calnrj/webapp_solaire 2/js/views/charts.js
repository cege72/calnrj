// Minimal SVG chart utilities (pie, stacked bars, lines)
function el(name, attrs={}){ const e=document.createElementNS('http://www.w3.org/2000/svg', name); for(const k in attrs){ e.setAttribute(k, attrs[k]); } return e; }

export function pieChart(container, data, opts={}){
  container.innerHTML='';
  const w = container.clientWidth || 300; const h = container.clientHeight || 260; const r = Math.min(w,h)/2 - 10;
  const svg = el('svg',{width:'100%', height:h, viewBox:`0 0 ${w} ${h}`});
  const cx=w/2, cy=h/2;
  const total = data.reduce((a,b)=> a+b.value, 0) || 1;
  let angle = -Math.PI/2;
  data.forEach(d=>{
    const a2 = angle + (d.value/total)*Math.PI*2;
    const x1 = cx + r*Math.cos(angle), y1 = cy + r*Math.sin(angle);
    const x2 = cx + r*Math.cos(a2), y2 = cy + r*Math.sin(a2);
    const large = (a2-angle) > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const p = el('path', { d: path, fill: d.color, stroke: 'none', 'fill-opacity': 0.9 });
    svg.appendChild(p);
    angle = a2;
  });
  // Legend
  let lx=10, ly=10;
  data.forEach(d=>{
    const g=el('g');
    const rect=el('rect',{x:lx,y:ly,width:12,height:12,fill:d.color});
    const txt=el('text',{x:lx+16,y:ly+11,fill:'currentColor','font-size':'12'}); txt.textContent=`${d.label}: ${(d.value/total*100).toFixed(1)}%`;
    g.appendChild(rect); g.appendChild(txt); svg.appendChild(g); ly+=16;
  });
  container.appendChild(svg);
}

export function stackedBars(container, series, categories, colors, opts={}){
  // series: [{name:'HP', data:[...]} , {name:'HC', data:[...]}, {name:'PV', data:[...]}]
  container.innerHTML='';
  const w = container.clientWidth || 600; const h = container.clientHeight || 320; const pad=40, bpad=60, rpad=10;
  const svg = el('svg',{width:'100%', height:h, viewBox:`0 0 ${w} ${h}`});
  const innerW = w - pad - rpad; const innerH = h - pad - bpad;
  const max = Math.max(1, ...categories.map((_,i)=> series.reduce((s,ser)=> s + (ser.data[i]||0), 0)));
  // axes
  const ax=el('line',{x1:pad,y1:h-bpad,x2:w-rpad,y2:h-bpad,stroke:'currentColor','stroke-opacity':.3});
  const ay=el('line',{x1:pad,y1:h-bpad,x2:pad,y2:pad,stroke:'currentColor','stroke-opacity':.3});
  svg.appendChild(ax); svg.appendChild(ay);
  const barW = innerW / categories.length * 0.7; const gap = innerW / categories.length * 0.3;
  categories.forEach((cat,i)=>{
    const x = pad + i*(barW+gap) + gap/2;
    let y = h - bpad;
    series.forEach((ser,si)=>{
      const v = ser.data[i]||0;
      const bh = v/max * innerH;
      const rect = el('rect',{x:x, y:y-bh, width:barW, height:bh, fill:colors[si], 'fill-opacity': .9});
      if(opts.onBarClick){ rect.style.cursor='pointer'; rect.addEventListener('click',()=> opts.onBarClick(i)); }
      svg.appendChild(rect);
      y -= bh;
    });
    const txt = el('text',{x:x+barW/2, y:h-bpad+14, 'text-anchor':'middle','font-size':'11', fill:'currentColor'}); txt.textContent=cat; svg.appendChild(txt);
  });
  // legend
  let lx=pad, ly=10; series.forEach((ser,si)=>{
    const rect=el('rect',{x:lx,y:ly,width:12,height:12,fill:colors[si]});
    const txt=el('text',{x:lx+16,y:ly+11,fill:'currentColor','font-size':'12'}); txt.textContent=ser.name; svg.appendChild(rect); svg.appendChild(txt); lx+=100;
  });
  container.appendChild(svg);
}

export function lineChartDual(container, series, categories, colors, opts={}){
  // series: [{name:'Durée jour (h)', data:[..], axis:'left'}, {name:'Lever', data:[..], axis:'right'}, {name:'Coucher', data:[..], axis:'right'}]
  container.innerHTML='';
  const w = container.clientWidth || 600; const h = container.clientHeight || 320; const pad=40, rpad=50, bpad=60;
  const svg = el('svg',{width:'100%', height:h, viewBox:`0 0 ${w} ${h}`});
  const innerW = w - pad - rpad; const innerH = h - pad - bpad;
  const leftMax = Math.max(1, ...series.filter(s=>s.axis!=='right').map(s=>Math.max(...s.data)));
  const rightMax = Math.max(24, ...series.filter(s=>s.axis==='right').map(s=>Math.max(...s.data)));
  // axes
  svg.appendChild(el('line',{x1:pad,y1:h-bpad,x2:w-rpad,y2:h-bpad,stroke:'currentColor','stroke-opacity':.3}));
  svg.appendChild(el('line',{x1:pad,y1:h-bpad,x2:pad,y2:pad,stroke:'currentColor','stroke-opacity':.3}));
  svg.appendChild(el('line',{x1:w-rpad,y1:h-bpad,x2:w-rpad,y2:pad,stroke:'currentColor','stroke-opacity':.3}));
  // y ticks left
  for(let i=0;i<=4;i++){
    const y = pad + innerH - i*innerH/4;
    const val = (leftMax * i/4).toFixed(1);
    const t=el('text',{x:pad-6,y:y+3,'text-anchor':'end',fill:'currentColor','font-size':'11'}); t.textContent=val; svg.appendChild(t);
  }
  // y ticks right
  for(let i=0;i<=6;i++){
    const y = pad + innerH - i*innerH/6;
    const val = (rightMax * i/6).toFixed(0);
    const t=el('text',{x:w-rpad+4,y:y+3,'text-anchor':'start',fill:'currentColor','font-size':'11'}); t.textContent=val; svg.appendChild(t);
  }
  // x labels
  categories.forEach((cat,i)=>{
    const x = pad + i*innerW/(categories.length-1);
    const txt=el('text',{x:x,y:h-bpad+14,'text-anchor':'middle','font-size':'11',fill:'currentColor'}); txt.textContent=cat; svg.appendChild(txt);
  });
  // lines
  series.forEach((ser,si)=>{
    const d = [];
    for(let i=0;i<ser.data.length;i++){
      const x = pad + i*innerW/(categories.length-1);
      const max = ser.axis==='right'? rightMax: leftMax;
      const y = pad + innerH - (ser.data[i]/max)*innerH;
      d.push(`${i===0? 'M':'L'} ${x} ${y}`);
    }
    const path = el('path',{ d: d.join(' '), fill:'none', stroke: colors[si], 'stroke-width':2 });
    svg.appendChild(path);
  });
  // legend
  let lx=pad, ly=10; series.forEach((ser,si)=>{
    const line=el('line',{x1:lx,y1:ly+6,x2:lx+18,y2:ly+6,stroke:colors[si],'stroke-width':2});
    const txt=el('text',{x:lx+24,y:ly+10,fill:'currentColor','font-size':'12'}); txt.textContent=ser.name; svg.appendChild(line); svg.appendChild(txt); lx+=150;
  });
  container.appendChild(svg);
}
