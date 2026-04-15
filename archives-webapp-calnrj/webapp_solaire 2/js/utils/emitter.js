export class Emitter {
  constructor(){ this.events = {}; }
  on(name, fn){ (this.events[name]||(this.events[name]=[])).push(fn); }
  emit(name, payload){ (this.events[name]||[]).forEach(fn => fn(payload)); }
}
