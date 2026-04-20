/* SheetJS placeholder. For Excel import offline, include xlsx.full.min.js in js/utils scope or keep this minimal subset. */
window.XLSX = window.XLSX || { read: function(){ throw new Error('XLSX non disponible dans cette version. Importez du CSV, ou remplacez ce stub par xlsx.full.min.js'); }, utils:{ sheet_to_json: function(){ return []; } }, SheetNames:[] };
