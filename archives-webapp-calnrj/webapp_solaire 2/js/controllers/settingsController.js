import { importFile } from '../utils/file.js';

export class SettingsController{
  constructor(state){ this.state = state; }
  init(){
    // Fill form
    document.getElementById('price-base').value = this.state.params.priceBase;
    document.getElementById('price-hp').value = this.state.params.priceHP;
    document.getElementById('price-hc').value = this.state.params.priceHC;
    document.getElementById('fixed-base').value = this.state.params.fixedBase;
    document.getElementById('fixed-hphc').value = this.state.params.fixedHPHC;

    // HC chips
    this.renderHC();
    document.getElementById('btn-add-hc').addEventListener('click', ()=>{
      const v = document.getElementById('hc-new').value.trim();
      if(v){ this.state.params.hcIntervals.push(v); document.getElementById('hc-new').value=''; this.renderHC(); this.state.setParams({ hcIntervals: this.state.params.hcIntervals }); }
    });

    // Save form
    document.getElementById('form-tariffs').addEventListener('submit', (e)=>{
      e.preventDefault();
      this.state.setParams({
        priceBase: Number(document.getElementById('price-base').value),
        priceHP: Number(document.getElementById('price-hp').value),
        priceHC: Number(document.getElementById('price-hc').value),
        fixedBase: Number(document.getElementById('fixed-base').value),
        fixedHPHC: Number(document.getElementById('fixed-hphc').value),
        hcIntervals: this.state.params.hcIntervals
      });
    });

    // Imports
    document.getElementById('file-consumption').addEventListener('change', async (e)=>{
      const log = document.getElementById('consumption-import-log'); log.textContent='Import en cours…';
      const file = e.target.files[0]; if(!file) return;
      try{
        const ds = await importFile(file);
        this.state.setConsumption(ds);
        log.textContent = `OK: ${ds.data.length} points, pas ${ds.minutes} min.`;
      }catch(err){ log.textContent = 'Erreur: '+err.message; }
    });
    document.getElementById('file-production').addEventListener('change', async (e)=>{
      const log = document.getElementById('production-import-log'); log.textContent='Import en cours…';
      const file = e.target.files[0]; if(!file) return;
      try{
        const ds = await importFile(file);
        this.state.setProduction(ds);
        log.textContent = `OK: ${ds.data.length} points, pas ${ds.minutes} min.`;
      }catch(err){ log.textContent = 'Erreur: '+err.message; }
    });
  }
  renderHC(){
    const wrap = document.getElementById('hc-intervals');
    wrap.innerHTML='';
    this.state.params.hcIntervals.forEach((v,idx)=>{
      const chip=document.createElement('div'); chip.className='chip'; chip.innerHTML=`<span>${v}</span>`;
      const btn=document.createElement('button'); btn.type='button'; btn.textContent='✕'; btn.addEventListener('click',()=>{
        this.state.params.hcIntervals.splice(idx,1); this.renderHC(); this.state.setParams({ hcIntervals: this.state.params.hcIntervals });
      });
      chip.appendChild(btn); wrap.appendChild(chip);
    });
  }
}
