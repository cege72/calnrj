export class ThemeController{
  constructor(){
    this.select = document.getElementById('theme-select');
    this.load();
    this.select.addEventListener('change', ()=> this.apply());
  }
  load(){
    const saved = localStorage.getItem('theme-mode') || 'auto';
    this.select.value = saved;
    this.apply();
  }
  apply(){
    const mode = this.select.value;
    localStorage.setItem('theme-mode', mode);
    const rootEl = document.documentElement;
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
    const setAuto = ()=>{ if(mq && mq.matches) rootEl.classList.add('light'); else rootEl.classList.remove('light'); };
    if(mode==='auto'){
      setAuto(); if(mq) mq.onchange = setAuto;
    } else if(mode==='light'){
      rootEl.classList.add('light'); if(mq) mq.onchange = null;
    } else {
      rootEl.classList.remove('light'); if(mq) mq.onchange = null;
    }
  }
}
