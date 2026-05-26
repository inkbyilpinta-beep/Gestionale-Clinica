import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TODAY = new Date("2026-05-18");
const daysAgo = (d) => Math.floor((TODAY - new Date(d)) / 86400000);
const monthsAgo = (d) => Math.floor(daysAgo(d) / 30);

const PAZIENTI = [
  { id:1, nome:"Marco",    cognome:"Bianchi",  cf:"BNCMRC78C12H501X", dataNascita:"1978-03-12", telefono:"333 1234567", email:"marco.bianchi@email.it", note:"Allergia amoxicillina", ultimaVisita:"2025-04-10", pacchetti:[1], score:87 },
  { id:2, nome:"Laura",    cognome:"Ferrari",  cf:"FRRLRA90L62H501Y", dataNascita:"1990-07-22", telefono:"347 9876543", email:"laura.ferrari@email.it",  note:"", ultimaVisita:"2025-11-20", pacchetti:[2], score:42 },
  { id:3, nome:"Giuseppe", cognome:"Russo",    cf:"RSSGPP65A30H501Z", dataNascita:"1965-01-30", telefono:"320 4567890", email:"g.russo@email.it",        note:"Preferisce mattina",  ultimaVisita:"2026-01-05", pacchetti:[], score:61 },
  { id:4, nome:"Alessia",  cognome:"Conti",    cf:"CNTLSS01P55H501W", dataNascita:"2001-09-15", telefono:"366 1122334", email:"ale.conti@gmail.com",      note:"", ultimaVisita:"2026-02-14", pacchetti:[1,3], score:28 },
  { id:5, nome:"Roberto",  cognome:"Marini",   cf:"MRNRRT70D15H501K", dataNascita:"1970-04-15", telefono:"349 5556677", email:"r.marini@email.it",        note:"Diabetico tipo 2",   ultimaVisita:"2024-10-01", pacchetti:[], score:95 },
  { id:6, nome:"Chiara",   cognome:"Esposito", cf:"SPTCHR88M45H501L", dataNascita:"1988-08-22", telefono:"334 7778899", email:"c.esposito@gmail.com",     note:"", ultimaVisita:"2025-06-15", pacchetti:[3], score:74 },
];

const PIANI = {
  1:[{ id:1, desc:"Detartrasi completa", prezzo:85, stato:"eseguito", data:"2025-04-10", medico:"Dr. Rossi" },{ id:2, desc:"Otturazione 2.6", prezzo:120, stato:"da_fare", data:null, medico:"Dr. Rossi" },{ id:3, desc:"Radiografia endorale", prezzo:30, stato:"da_fare", data:null, medico:"Dr. Rossi" }],
  2:[{ id:1, desc:"Visita ortodontica", prezzo:80, stato:"eseguito", data:"2025-11-20", medico:"Dr. Rossi" },{ id:2, desc:"Sbiancamento professionale", prezzo:350, stato:"da_fare", data:null, medico:"Dr. Rossi" }],
  3:[{ id:1, desc:"Detartrasi completa", prezzo:85, stato:"eseguito", data:"2026-01-05", medico:"Dr. Rossi" },{ id:2, desc:"Corona 2.7 zirconio", prezzo:900, stato:"da_fare", data:null, medico:"Dr. Rossi" }],
  4:[{ id:1, desc:"Prima visita + foto", prezzo:99, stato:"eseguito", data:"2026-02-14", medico:"Dr. Rossi" }],
  5:[{ id:1, desc:"Detartrasi completa", prezzo:85, stato:"da_fare", data:null, medico:"Dr. Rossi" },{ id:2, desc:"Implant 3.6", prezzo:1800, stato:"da_fare", data:null, medico:"Dr. Rossi" }],
  6:[{ id:1, desc:"Sbiancamento home", prezzo:180, stato:"da_fare", data:null, medico:"Dr. Rossi" }],
};

const PREVENTIVI = [
  { id:1, pazienteId:1, data:"2025-04-10", totale:235, stato:"accettato", voci:[{desc:"Detartrasi",imp:85},{desc:"Otturazione 2.6",imp:120},{desc:"Rx",imp:30}] },
  { id:2, pazienteId:2, data:"2025-11-20", totale:430, stato:"in_attesa", voci:[{desc:"Visita ortod.",imp:80},{desc:"Sbiancamento",imp:350}] },
  { id:3, pazienteId:3, data:"2026-01-05", totale:985, stato:"accettato", voci:[{desc:"Detartrasi",imp:85},{desc:"Corona 2.7",imp:900}] },
  { id:4, pazienteId:5, data:"2026-04-20", totale:1885, stato:"in_attesa", voci:[{desc:"Detartrasi",imp:85},{desc:"Implant 3.6",imp:1800}] },
  { id:5, pazienteId:6, data:"2026-05-01", totale:180, stato:"in_attesa", voci:[{desc:"Sbiancamento",imp:180}] },
];

const PACCHETTI = [
  { id:1, nome:"Piano Prevenzione Annuale", prezzo:300, rate:12, mensile:28, colore:"#2D6A4F", scadenza:"2026-06-01", prestazioni:["Detartrasi x2","Controllo x2","Coaching igiene","Recall automatico","Priorità urgenze"] },
  { id:2, nome:"Smile & Face", prezzo:850, rate:null, mensile:null, colore:"#7B2D8B", scadenza:"2026-07-15", prestazioni:["Consulenza sorriso-viso","Piano estetico","Primo trattamento incluso","Follow-up 3 mesi","Priorità agenda"] },
  { id:3, nome:"Ingresso Prevenzione", prezzo:99, rate:null, mensile:null, colore:"#1D4E89", scadenza:"2026-12-31", prestazioni:["Prima visita","Status fotografico","Indice placca","RX indicata","Piano scritto"] },
];

const UTENTI = [
  { id:1, nome:"Dr. Luca Rossi",    ruolo:"medico",     vendite:4, fatturato:3200 },
  { id:2, nome:"Dr.ssa Anna Verdi", ruolo:"medico",     vendite:2, fatturato:1850 },
  { id:3, nome:"Sofia Russo",       ruolo:"assistente", vendite:3, fatturato:849 },
  { id:4, nome:"Giulia Bianchi",    ruolo:"admin",      vendite:1, fatturato:300 },
];

const VENDITE = [
  { id:1, pacchettoId:1, pazienteId:1, venditoreId:1, data:"2026-01-15", importo:300 },
  { id:2, pacchettoId:3, pazienteId:4, venditoreId:3, data:"2026-02-14", importo:99 },
  { id:3, pacchettoId:2, pazienteId:2, venditoreId:2, data:"2025-12-10", importo:850 },
  { id:4, pacchettoId:1, pazienteId:4, venditoreId:3, data:"2026-02-14", importo:300 },
  { id:5, pacchettoId:1, pazienteId:3, venditoreId:1, data:"2026-01-22", importo:300 },
  { id:6, pacchettoId:3, pazienteId:2, venditoreId:4, data:"2025-12-06", importo:99 },
];

const APPUNTAMENTI = [
  { id:1, pazienteId:2, medicoId:1, riunito:"Riunito 1", tipo:"igiene",      start:"09:00", end:"09:30", stato:"confermato",  data:"2026-05-18" },
  { id:2, pazienteId:3, medicoId:1, riunito:"Riunito 1", tipo:"produzione",  start:"10:00", end:"11:00", stato:"confermato",  data:"2026-05-18" },
  { id:3, pazienteId:4, medicoId:2, riunito:"Riunito 2", tipo:"acquisizione",start:"09:30", end:"10:00", stato:"in_attesa",   data:"2026-05-18" },
  { id:4, pazienteId:6, medicoId:1, riunito:"Estetica",  tipo:"estetica",    start:"11:00", end:"11:30", stato:"confermato",  data:"2026-05-18" },
  { id:5, pazienteId:1, medicoId:1, riunito:"Riunito 1", tipo:"produzione",  start:"15:00", end:"16:30", stato:"confermato",  data:"2026-05-18" },
  { id:6, pazienteId:5, medicoId:2, riunito:"Riunito 2", tipo:"produzione",  start:"15:30", end:"17:00", stato:"no_show",     data:"2026-05-18" },
];

const NOTIFICHE_INIT = [
  { id:1, tipo:"preventivo", msg:"Marco Bianchi ha accettato il preventivo di €235", letto:false, ora:"08:42" },
  { id:2, tipo:"noshoww",    msg:"Roberto Marini non si è presentato — slot 15:30 libero", letto:false, ora:"15:35" },
  { id:3, tipo:"recall",     msg:"Chiara Esposito non risponde al recall da 14 giorni", letto:false, ora:"ieri" },
  { id:4, tipo:"abbonamento",msg:"Piano annuale di Marco Bianchi scade tra 14 giorni", letto:true,  ora:"ieri" },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────
const I = ({ n, s=16 }) => {
  const m = {
    tooth:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C9.5 2 7 4 7 7c0 2 1 3.5 1 5.5C8 15 9 20 12 20s4-5 4-7.5c0-2 1-3.5 1-5.5 0-3-2.5-5-5-5z"/></svg>,
    users:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    clipboard:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    package:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    file:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    award:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
    invoice:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>,
    bell:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    calendar:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    recall:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
    plus:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    check:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    x:          <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    edit:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    back:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    search:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    trend:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    star:       <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    whatsapp:   <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
    genya:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8"/><path d="M7.5 4.27l9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
  };
  return m[n] || null;
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F4F1EC;--surface:#FFFFFF;--surface2:#EDE9E1;--border:#DDD8CE;
  --text:#1C1917;--text2:#6B6560;--text3:#A09890;
  --accent:#1E4D35;--accent-l:#E6F0EB;--accent-m:#3A7D56;
  --l1:#16A34A;--l1bg:#DCFCE7;
  --l2:#D97706;--l2bg:#FEF3C7;
  --l3:#DC2626;--l3bg:#FEE2E2;
  --l4:#7C3AED;--l4bg:#EDE9FE;
  --danger:#DC2626;--warn:#D97706;--success:#16A34A;--info:#2563EB;
  --sh:0 1px 3px rgba(0,0,0,0.06),0 4px 20px rgba(0,0,0,0.05);
  --sh-lg:0 8px 40px rgba(0,0,0,0.12);
  --r:10px;--sidebar:228px;
  --font-display:'Playfair Display',serif;
  --font:'Outfit',sans-serif;
}
html,body,#root{height:100%;font-family:var(--font);background:var(--bg);color:var(--text)}

/* ── LAYOUT ── */
.layout{display:flex;height:100vh;overflow:hidden}
.sidebar{width:var(--sidebar);background:var(--text);display:flex;flex-direction:column;flex-shrink:0}
.sidebar-logo{padding:24px 20px 18px;border-bottom:1px solid rgba(255,255,255,0.07)}
.sidebar-logo-name{font-family:var(--font-display);font-size:17px;color:#fff;line-height:1.2}
.sidebar-logo-sub{font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.8px;margin-top:3px}
.sidebar-nav{flex:1;padding:10px 0;overflow-y:auto}
.nav-section{padding:14px 20px 4px;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.25)}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;cursor:pointer;color:rgba(255,255,255,0.48);font-size:13px;font-weight:500;border-left:2px solid transparent;transition:all .15s;position:relative}
.nav-item:hover{color:rgba(255,255,255,0.82);background:rgba(255,255,255,0.04)}
.nav-item.active{color:#fff;border-left-color:#5DB87A;background:rgba(255,255,255,0.06)}
.nav-badge{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:#DC2626;color:#fff;font-size:10px;font-weight:700;border-radius:10px;padding:1px 6px;min-width:18px;text-align:center}
.sidebar-footer{padding:14px 20px;border-top:1px solid rgba(255,255,255,0.07)}
.sidebar-user{font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.7)}
.sidebar-role{font-size:10.5px;color:rgba(255,255,255,0.3);margin-top:2px}

/* ── MAIN ── */
.main{flex:1;overflow-y:auto;display:flex;flex-direction:column}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:13px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;gap:16px}
.topbar-left{display:flex;align-items:center;gap:12px}
.topbar-title{font-family:var(--font-display);font-size:21px;color:var(--text)}
.topbar-actions{display:flex;gap:10px;align-items:center}
.page{padding:22px 28px;flex:1}

/* ── NOTIFICHE DROPDOWN ── */
.notif-btn{position:relative;cursor:pointer;padding:7px;border-radius:8px;color:var(--text2);transition:all .15s}
.notif-btn:hover{background:var(--surface2);color:var(--text)}
.notif-dot{position:absolute;top:5px;right:5px;width:8px;height:8px;background:#DC2626;border-radius:50%;border:2px solid var(--surface)}
.notif-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:320px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh-lg);z-index:100;overflow:hidden}
.notif-header{padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600}
.notif-item{padding:11px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s}
.notif-item:hover{background:var(--surface2)}
.notif-item.unread{background:#FAFAF8}
.notif-item:last-child{border-bottom:none}
.notif-msg{font-size:12.5px;color:var(--text);line-height:1.4}
.notif-time{font-size:11px;color:var(--text3);margin-top:3px}
.notif-unread-dot{width:7px;height:7px;background:#DC2626;border-radius:50%;flex-shrink:0;margin-top:4px}

/* ── CARDS ── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--sh)}
.card-header{padding:15px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.card-title{font-size:13.5px;font-weight:600;color:var(--text)}
.card-body{padding:18px 20px}

/* ── STATS ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.stat.c-green::before{background:var(--success)}
.stat.c-blue::before{background:var(--info)}
.stat.c-warn::before{background:var(--warn)}
.stat.c-purple::before{background:#7C3AED}
.stat.c-red::before{background:var(--danger)}
.stat-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin-bottom:8px}
.stat-val{font-family:var(--font-display);font-size:26px;color:var(--text);line-height:1}
.stat-sub{font-size:11.5px;color:var(--text3);margin-top:5px}
.stat-trend{position:absolute;top:14px;right:14px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:3px}
.stat-trend.up{color:var(--success)}
.stat-trend.down{color:var(--danger)}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:7px;font-size:12.5px;font-weight:500;border:none;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#163b27}
.btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-secondary:hover{background:var(--border)}
.btn-danger{background:#FEE2E2;color:var(--danger);border:1px solid #FECACA}
.btn-danger:hover{background:#FECACA}
.btn-sm{padding:5px 11px;font-size:12px}
.btn-ghost{background:transparent;color:var(--text2);padding:6px 9px}
.btn-ghost:hover{background:var(--surface2);color:var(--text)}
.btn-icon{padding:6px}

/* ── BADGES ── */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.1px}
.bg-green{background:#DCFCE7;color:#15803D}
.bg-orange{background:#FEF3C7;color:#B45309}
.bg-blue{background:#DBEAFE;color:#1D4ED8}
.bg-red{background:#FEE2E2;color:#B91C1C}
.bg-gray{background:var(--surface2);color:var(--text2)}
.bg-purple{background:#EDE9FE;color:#6D28D9}
.bg-teal{background:#CCFBF1;color:#0F766E}

/* ── SCORE BADGE ── */
.score{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;font-size:11.5px;font-weight:700}
.score.high{background:#FEE2E2;color:#B91C1C}
.score.med{background:#FEF3C7;color:#B45309}
.score.low{background:#DCFCE7;color:#15803D}

/* ── TABLE ── */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:9px 13px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);background:var(--surface2);border-bottom:1px solid var(--border)}
td{padding:10px 13px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr.clickable{cursor:pointer}
tr.clickable:hover td{background:#FAFAF8}

/* ── FORM ── */
.form-group{margin-bottom:14px}
.form-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:5px}
.form-input,.form-select,.form-textarea{width:100%;padding:8px 11px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit;background:var(--surface);color:var(--text);outline:none;transition:border-color .15s}
.form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--accent-m)}
.form-textarea{resize:vertical;min-height:70px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}

/* ── MODAL ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.modal{background:var(--surface);border-radius:14px;box-shadow:var(--sh-lg);width:100%;max-width:540px;max-height:90vh;overflow-y:auto}
.modal-lg{max-width:700px}
.modal-header{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.modal-title{font-family:var(--font-display);font-size:18px}
.modal-body{padding:22px}
.modal-footer{padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px}

/* ── GRID ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}
.mb3{margin-bottom:12px}
.mb4{margin-bottom:16px}
.mb5{margin-bottom:20px}
.flex{display:flex}.fac{align-items:center}.gap2{gap:8px}.gap3{gap:12px}.jsb{justify-content:space-between}
.text-sm{font-size:12.5px}.text-xs{font-size:11.5px}.text-muted{color:var(--text2)}.text-xs-muted{font-size:11px;color:var(--text3)}
.font-bold{font-weight:600}.font-serif{font-family:var(--font-display)}

/* ── RECALL ITEMS ── */
.recall-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--surface);cursor:pointer;transition:all .15s}
.recall-item:hover{border-color:var(--accent-m);box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.recall-urgency{width:10px;height:10px;border-radius:50%;flex-shrink:0}

/* ── PIANO ITEMS ── */
.piano-item{display:flex;align-items:center;gap:11px;padding:10px 13px;border:1px solid var(--border);border-radius:8px;margin-bottom:7px;background:var(--surface)}
.piano-item.done{opacity:.6}
.piano-check{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .15s}
.piano-check.done{background:var(--success);color:#fff}
.piano-check.todo{background:var(--surface2);border:2px solid var(--border)}
.piano-check.todo:hover{border-color:var(--accent-m)}

/* ── AGENDA ── */
.agenda-grid{display:grid;grid-template-columns:60px 1fr 1fr 1fr;gap:0}
.agenda-header{padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);background:var(--surface2);border:1px solid var(--border);text-align:center}
.agenda-time{padding:8px 10px;font-size:11.5px;color:var(--text3);border:1px solid var(--border);text-align:right;background:var(--surface)}
.agenda-cell{border:1px solid var(--border);min-height:38px;position:relative;background:var(--surface)}
.agenda-slot{position:absolute;inset:2px;border-radius:5px;padding:3px 6px;font-size:11px;font-weight:500;overflow:hidden;cursor:pointer}
.slot-igiene{background:#DBEAFE;color:#1D4ED8;border-left:3px solid #2563EB}
.slot-produzione{background:#DCFCE7;color:#15803D;border-left:3px solid #16A34A}
.slot-estetica{background:#EDE9FE;color:#6D28D9;border-left:3px solid #7C3AED}
.slot-acquisizione{background:#FEF3C7;color:#B45309;border-left:3px solid #D97706}
.slot-noshoww{background:#FEE2E2;color:#B91C1C;border-left:3px solid #DC2626;opacity:.7}

/* ── TABS ── */
.tabs{display:flex;gap:4px;background:var(--surface2);border-radius:8px;padding:3px;margin-bottom:18px}
.tab{padding:6px 15px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;color:var(--text2);transition:all .15s}
.tab.active{background:var(--surface);color:var(--text);box-shadow:var(--sh)}

/* ── LEVEL BADGES ── */
.lvl-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.3px}
.lvl-1{background:var(--l1bg);color:var(--l1)}
.lvl-2{background:var(--l2bg);color:var(--l2)}
.lvl-3{background:var(--l3bg);color:var(--l3)}
.lvl-4{background:var(--l4bg);color:var(--l4)}

/* ── MISC ── */
.divider{border:none;border-top:1px solid var(--border);margin:16px 0}
.empty{text-align:center;padding:40px 20px;color:var(--text3);font-size:13px}
.pill-tipo{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:600}
.section-title{font-family:var(--font-display);font-size:15px;margin-bottom:12px;color:var(--text)}
.alert-banner{background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#B45309;display:flex;align-items:center;gap:8px;margin-bottom:16px}
.alert-banner.red{background:#FEE2E2;border-color:#FECACA;color:#B91C1C}
.genya-bar{background:linear-gradient(135deg,#1A3C2A,#2B5741);border-radius:var(--r);padding:16px 20px;color:#fff;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.dot-green{background:#4ADE80}.dot-yellow{background:#FDE047}
.rank-bar{height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;flex:1}
.rank-fill{height:100%;background:var(--accent-m);border-radius:3px}
.rank-num{width:22px;height:22px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;color:var(--text2);flex-shrink:0}
.rank-num.gold{background:#FEF3C7;color:#B45309}
.pacchetto-card{border:1px solid var(--border);border-radius:var(--r);overflow:hidden;background:var(--surface)}
.pacchetto-head{padding:14px 16px;color:#fff}
.pacchetto-body{padding:14px 16px}
.pacchetto-feat{font-size:12px;color:var(--text2);padding:3px 0;display:flex;align-items:flex-start;gap:7px}

/* ── ANIMATIONS ── */
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.page>*{animation:fadeIn .2s ease forwards}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.pulse{animation:pulse 2s infinite}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const recallUrgency = (p) => {
  const m = monthsAgo(p.ultimaVisita);
  if (m >= 12) return { level: "alta", color: "#DC2626", label: `${m} mesi fa` };
  if (m >= 9)  return { level: "media", color: "#D97706", label: `${m} mesi fa` };
  if (m >= 6)  return { level: "bassa", color: "#16A34A", label: `${m} mesi fa` };
  return null;
};

const abbScadenza = (pid) => {
  const pk = PACCHETTI.find(p => p.id === pid);
  if (!pk) return null;
  const days = Math.floor((new Date(pk.scadenza) - TODAY) / 86400000);
  if (days < 0)  return { stato: "scaduto",  color: "bg-red",    days };
  if (days <= 30) return { stato: "scadenza", color: "bg-orange", days };
  return { stato: "attivo", color: "bg-green", days };
};

const scoreBadge = (s) => {
  if (s >= 70) return "high";
  if (s >= 40) return "med";
  return "low";
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [pazienti, setPazienti] = useState(PAZIENTI);
  const [piani, setPiani] = useState(PIANI);
  const [preventivi, setPreventivi] = useState(PREVENTIVI);
  const [pacchetti, setPacchetti] = useState(PACCHETTI);
  const [vendite, setVendite] = useState(VENDITE);
  const [appuntamenti, setAppuntamenti] = useState(APPUNTAMENTI);
  const [notifiche, setNotifiche] = useState(NOTIFICHE_INIT);
  const [selectedPaz, setSelectedPaz] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const unread = notifiche.filter(n => !n.letto).length;

  useEffect(() => {
    const fn = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const openPaz = (p) => { setSelectedPaz(p); setPage("scheda"); };
  const recallList = pazienti.filter(p => recallUrgency(p) !== null).sort((a,b) => monthsAgo(b.ultimaVisita) - monthsAgo(a.ultimaVisita));
  const prevScaduti = preventivi.filter(p => p.stato === "in_attesa" && daysAgo(p.data) > 7);

  const navSections = [
    { label: "Clinica", items: [
      { id:"dashboard", label:"Dashboard", icon:"tooth" },
      { id:"pazienti",  label:"Pazienti",  icon:"users" },
      { id:"piani",     label:"Piani di cura", icon:"clipboard" },
      { id:"agenda",    label:"Agenda", icon:"calendar" },
    ]},
    { label: "Automazioni L1–L3", items: [
      { id:"recall",    label:"Recall", icon:"recall",  badge: recallList.filter(p=>monthsAgo(p.ultimaVisita)>=12).length },
      { id:"preventivi",label:"Preventivi", icon:"file", badge: prevScaduti.length },
      { id:"pacchetti", label:"Pacchetti", icon:"package" },
      { id:"premi",     label:"Premio produzione", icon:"award" },
    ]},
    { label: "Integrazioni L4", items: [
      { id:"fatturazione", label:"Fatturazione Genya", icon:"genya" },
    ]},
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-name">Studio Dentistico</div>
            <div className="sidebar-logo-sub">Gestionale v2</div>
          </div>
          <nav className="sidebar-nav">
            {navSections.map(sec => (
              <div key={sec.label}>
                <div className="nav-section">{sec.label}</div>
                {sec.items.map(item => (
                  <div key={item.id}
                    className={`nav-item${page === item.id || (page === "scheda" && item.id === "pazienti") ? " active" : ""}`}
                    onClick={() => setPage(item.id)}>
                    <I n={item.icon} s={14} />
                    {item.label}
                    {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">Dr. Luca Rossi</div>
            <div className="sidebar-role">Medico Titolare</div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <div className="topbar-left">
              {page === "scheda" && (
                <button className="btn btn-ghost btn-icon" onClick={() => setPage("pazienti")}><I n="back" /></button>
              )}
              <span className="topbar-title">
                {page === "dashboard" && "Dashboard"}
                {page === "pazienti" && "Pazienti"}
                {page === "scheda" && selectedPaz && `${selectedPaz.cognome} ${selectedPaz.nome}`}
                {page === "piani" && "Piani di Cura"}
                {page === "agenda" && "Agenda — Lunedì 18 maggio"}
                {page === "recall" && "Recall Automatico"}
                {page === "preventivi" && "Preventivi"}
                {page === "pacchetti" && "Pacchetti & Percorsi"}
                {page === "premi" && "Premio Produzione"}
                {page === "fatturazione" && "Fatturazione · Genya"}
              </span>
              {page === "recall" && <span className="lvl-badge lvl-1">L1 AUTO</span>}
              {page === "agenda" && <span className="lvl-badge lvl-2">L2 AGENDA</span>}
              {page === "fatturazione" && <span className="lvl-badge lvl-4">L4 SYNC</span>}
            </div>
            <div className="topbar-actions">
              {/* NOTIFICHE */}
              <div style={{ position:"relative" }} ref={notifRef}>
                <div className="notif-btn flex fac" onClick={() => setShowNotif(!showNotif)}>
                  <I n="bell" s={18} />
                  {unread > 0 && <span className="notif-dot" />}
                </div>
                {showNotif && (
                  <div className="notif-dropdown">
                    <div className="notif-header flex jsb fac">
                      <span>Notifiche</span>
                      <span className="badge bg-red">{unread} nuove</span>
                    </div>
                    {notifiche.map(n => (
                      <div key={n.id} className={`notif-item${!n.letto ? " unread" : ""}`}
                        onClick={() => setNotifiche(notifiche.map(x => x.id === n.id ? {...x, letto:true} : x))}>
                        <div className="flex gap2">
                          {!n.letto && <div className="notif-unread-dot" />}
                          <div style={{ flex:1 }}>
                            <div className="notif-msg">{n.msg}</div>
                            <div className="notif-time">{n.ora}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAGES */}
          {page === "dashboard" && <Dashboard pazienti={pazienti} preventivi={preventivi} vendite={vendite} recallList={recallList} prevScaduti={prevScaduti} notifiche={notifiche} onNav={setPage} onOpenPaz={openPaz} />}
          {page === "pazienti"  && <PazientiPage pazienti={pazienti} pacchetti={pacchetti} onOpen={openPaz} onAdd={p => setPazienti([...pazienti, {...p, id:Date.now(), score:0, pacchetti:[]}])} />}
          {page === "scheda" && selectedPaz && <SchedaPaz paziente={selectedPaz} piani={piani[selectedPaz.id]||[]} preventivi={preventivi.filter(p=>p.pazienteId===selectedPaz.id)} pacchetti={pacchetti} vendite={vendite} utenti={UTENTI}
            onUpdatePaz={p=>{setPazienti(pazienti.map(x=>x.id===p.id?p:x));setSelectedPaz(p)}}
            onUpdatePiano={items=>setPiani({...piani,[selectedPaz.id]:items})}
            onAddPrev={pr=>setPreventivi([...preventivi,{...pr,id:Date.now(),pazienteId:selectedPaz.id}])}
            onUpdatePrev={pr=>setPreventivi(preventivi.map(x=>x.id===pr.id?pr:x))}
            onAddVendita={v=>{setVendite([...vendite,{...v,id:Date.now()}]);const upd={...selectedPaz,pacchetti:[...new Set([...selectedPaz.pacchetti,v.pacchettoId])]};setPazienti(pazienti.map(x=>x.id===upd.id?upd:x));setSelectedPaz(upd);}}
          />}
          {page === "piani" && <PianiPage pazienti={pazienti} piani={piani} onOpen={openPaz} />}
          {page === "agenda" && <AgendaPage appuntamenti={appuntamenti} pazienti={pazienti} onUpdate={a=>setAppuntamenti(appuntamenti.map(x=>x.id===a.id?a:x))} onAdd={a=>setAppuntamenti([...appuntamenti,{...a,id:Date.now()}])} />}
          {page === "recall" && <RecallPage recallList={recallList} onOpen={openPaz} />}
          {page === "preventivi" && <PreventiviPage preventivi={preventivi} pazienti={pazienti} prevScaduti={prevScaduti} onUpdate={pr=>setPreventivi(preventivi.map(x=>x.id===pr.id?pr:x))} />}
          {page === "pacchetti" && <PacchettiPage pacchetti={pacchetti} onAdd={p=>setPacchetti([...pacchetti,{...p,id:Date.now()}])} onDelete={id=>setPacchetti(pacchetti.filter(x=>x.id!==id))} />}
          {page === "premi" && <PremiPage vendite={vendite} utenti={UTENTI} pacchetti={pacchetti} pazienti={pazienti} />}
          {page === "fatturazione" && <FattPage preventivi={preventivi} pazienti={pazienti} onUpdate={pr=>setPreventivi(preventivi.map(x=>x.id===pr.id?pr:x))} />}
        </div>
      </div>
    </>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ pazienti, preventivi, vendite, recallList, prevScaduti, notifiche, onNav, onOpenPaz }) {
  const fatturato = preventivi.filter(p=>p.stato==="accettato").reduce((s,p)=>s+p.totale,0);
  const inAttesa  = preventivi.filter(p=>p.stato==="in_attesa").reduce((s,p)=>s+p.totale,0);
  const totVendite = vendite.reduce((s,v)=>s+v.importo,0);
  const abbScad   = pazienti.filter(p=>p.pacchetti.some(pid=>{ const s=abbScadenza(pid); return s&&s.stato!=="attivo"; })).length;

  return (
    <div className="page">
      {/* ALERT BANNER */}
      {prevScaduti.length > 0 && (
        <div className="alert-banner" style={{ cursor:"pointer" }} onClick={()=>onNav("preventivi")}>
          ⚠️ <strong>{prevScaduti.length} preventivi</strong> in attesa da oltre 7 giorni — follow-up necessario
        </div>
      )}
      {recallList.filter(p=>monthsAgo(p.ultimaVisita)>=12).length > 0 && (
        <div className="alert-banner red" style={{ cursor:"pointer" }} onClick={()=>onNav("recall")}>
          🔴 <strong>{recallList.filter(p=>monthsAgo(p.ultimaVisita)>=12).length} pazienti</strong> non tornano da oltre 12 mesi — recall urgente
        </div>
      )}

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat c-green">
          <div className="stat-label">Fatturato accettato</div>
          <div className="stat-val">€{fatturato.toLocaleString("it")}</div>
          <div className="stat-sub">{preventivi.filter(p=>p.stato==="accettato").length} preventivi</div>
          <div className="stat-trend up"><I n="trend" s={12} /> +12%</div>
        </div>
        <div className="stat c-blue">
          <div className="stat-label">In attesa di risposta</div>
          <div className="stat-val">€{inAttesa.toLocaleString("it")}</div>
          <div className="stat-sub">{preventivi.filter(p=>p.stato==="in_attesa").length} preventivi aperti</div>
        </div>
        <div className="stat c-warn">
          <div className="stat-label">Ricavi pacchetti</div>
          <div className="stat-val">€{totVendite.toLocaleString("it")}</div>
          <div className="stat-sub">{vendite.length} vendite totali</div>
          <div className="stat-trend up"><I n="trend" s={12} /> +8%</div>
        </div>
        <div className="stat c-red">
          <div className="stat-label">Recall urgenti</div>
          <div className="stat-val">{recallList.filter(p=>monthsAgo(p.ultimaVisita)>=12).length}</div>
          <div className="stat-sub">abbonamenti: {abbScad} in scadenza</div>
        </div>
      </div>

      <div className="g2">
        {/* RECALL WIDGET */}
        <div className="card">
          <div className="card-header">
            <div className="flex fac gap2"><span className="card-title">Recall urgenti</span><span className="lvl-badge lvl-1">L1</span></div>
            <button className="btn btn-sm btn-secondary" onClick={()=>onNav("recall")}>Vedi tutti</button>
          </div>
          <div className="card-body" style={{padding:"14px 16px"}}>
            {recallList.slice(0,4).map(p => {
              const u = recallUrgency(p);
              return (
                <div key={p.id} className="recall-item" onClick={()=>onOpenPaz(p)}>
                  <div className="recall-urgency" style={{background:u.color}} />
                  <div style={{flex:1}}>
                    <div className="text-sm font-bold">{p.cognome} {p.nome}</div>
                    <div className="text-xs-muted">Ultima visita: {u.label}</div>
                  </div>
                  <div className={`score ${scoreBadge(p.score)}`}>{p.score}</div>
                  <span className={`badge ${u.level==="alta"?"bg-red":u.level==="media"?"bg-orange":"bg-green"}`}>{u.level}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ABBONAMENTI + PREVENTIVI */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="card">
            <div className="card-header">
              <div className="flex fac gap2"><span className="card-title">Abbonamenti</span><span className="lvl-badge lvl-1">L1</span></div>
            </div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <tbody>
                  {pazienti.filter(p=>p.pacchetti.length>0).slice(0,4).map(p=>{
                    const sc = p.pacchetti.map(pid=>abbScadenza(pid)).filter(Boolean)[0];
                    return (
                      <tr key={p.id} className="clickable" onClick={()=>onOpenPaz(p)}>
                        <td><strong>{p.cognome} {p.nome}</strong></td>
                        <td>{sc && <span className={`badge ${sc.color}`}>{sc.stato==="attivo"?"Attivo":sc.stato==="scadenza"?`Scade in ${sc.days}gg`:"Scaduto"}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="flex fac gap2"><span className="card-title">Preventivi urgenti</span><span className="lvl-badge lvl-1">L1</span></div>
              <button className="btn btn-sm btn-secondary" onClick={()=>onNav("preventivi")}>Tutti</button>
            </div>
            <div className="card-body" style={{padding:0}}>
              <table>
                <tbody>
                  {prevScaduti.map(pr=>{
                    const paz=pazienti.find(p=>p.id===pr.pazienteId);
                    return (
                      <tr key={pr.id}>
                        <td><strong>{paz?.cognome}</strong></td>
                        <td><span className="badge bg-red">{daysAgo(pr.data)}gg</span></td>
                        <td><strong>€{pr.totale}</strong></td>
                      </tr>
                    );
                  })}
                  {prevScaduti.length===0 && <tr><td colSpan={3} className="empty">Nessun preventivo scaduto</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT SETTIMANALE */}
      <div className="card" style={{marginTop:18}}>
        <div className="card-header">
          <div className="flex fac gap2"><span className="card-title">Report settimanale automatico</span><span className="lvl-badge lvl-2">L2</span></div>
          <span className="text-xs-muted">Settimana 11–17 maggio 2026</span>
        </div>
        <div className="card-body">
          <div className="g3">
            {[["Acceptance rate","68%","bg-green","Preventivi accettati/totali"],["Show rate","82%","bg-blue","Presenti/appuntamenti"],["Rebooking","74%","bg-teal","Con prossima visita fissata"],].map(([l,v,c,s])=>(
              <div key={l} style={{textAlign:"center",padding:"12px 0"}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:32,marginBottom:4}}>{v}</div>
                <div style={{fontSize:12,fontWeight:600,marginBottom:3}}><span className={`badge ${c}`}>{l}</span></div>
                <div className="text-xs-muted">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAZIENTI PAGE ────────────────────────────────────────────────────────────
function PazientiPage({ pazienti, pacchetti, onOpen, onAdd }) {
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({nome:"",cognome:"",dataNascita:"",telefono:"",email:"",cf:"",note:""});

  const filtered = pazienti.filter(p=>`${p.nome}${p.cognome}${p.cf}${p.telefono}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page">
        <div className="card">
          <div className="card-header">
            <div style={{position:"relative",width:260}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text3)"}}><I n="search" s={14} /></span>
              <input className="form-input" style={{paddingLeft:32}} placeholder="Cerca paziente…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
            <div className="flex fac gap2">
              <span className="text-xs-muted">{filtered.length} pazienti</span>
              <button className="btn btn-primary" onClick={()=>setShowModal(true)}><I n="plus" s={13} /> Nuovo</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Paziente</th><th>Telefono</th><th>Ultima visita</th><th>Score</th><th>Abbonamento</th><th>Recall</th><th></th></tr></thead>
              <tbody>
                {filtered.map(p=>{
                  const u = recallUrgency(p);
                  const sc = p.pacchetti.map(pid=>abbScadenza(pid)).filter(Boolean)[0];
                  return (
                    <tr key={p.id} className="clickable" onClick={()=>onOpen(p)}>
                      <td><div className="font-bold">{p.cognome} {p.nome}</div><div className="text-xs-muted">{p.dataNascita}</div></td>
                      <td className="text-sm">{p.telefono}</td>
                      <td className="text-sm">{p.ultimaVisita}</td>
                      <td><div className={`score ${scoreBadge(p.score)}`}>{p.score}</div></td>
                      <td>{sc?<span className={`badge ${sc.color}`}>{sc.stato==="attivo"?"Attivo":sc.stato==="scadenza"?`${sc.days}gg`:"Scaduto"}</span>:<span className="text-xs-muted">—</span>}</td>
                      <td>{u?<span className={`badge ${u.level==="alta"?"bg-red":u.level==="media"?"bg-orange":"bg-green"}`}>{u.level}</span>:<span className="text-xs-muted">—</span>}</td>
                      <td onClick={e=>e.stopPropagation()}><button className="btn btn-sm btn-secondary" onClick={()=>onOpen(p)}>Apri</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="overlay">
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Nuovo Paziente</div><button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><I n="x" /></button></div>
            <div className="modal-body">
              <div className="form-row mb3"><div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></div><div className="form-group"><label className="form-label">Cognome *</label><input className="form-input" value={form.cognome} onChange={e=>setForm({...form,cognome:e.target.value})} /></div></div>
              <div className="form-row mb3"><div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} /></div><div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div></div>
              <div className="form-row mb3"><div className="form-group"><label className="form-label">Data nascita</label><input type="date" className="form-input" value={form.dataNascita} onChange={e=>setForm({...form,dataNascita:e.target.value})} /></div><div className="form-group"><label className="form-label">Codice Fiscale</label><input className="form-input" value={form.cf} onChange={e=>setForm({...form,cf:e.target.value})} /></div></div>
              <div className="form-group"><label className="form-label">Note cliniche</label><textarea className="form-textarea" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Allergie, patologie rilevanti…" /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Annulla</button><button className="btn btn-primary" onClick={()=>{if(!form.nome||!form.cognome)return;onAdd({...form,ultimaVisita:"—"});setShowModal(false);setForm({nome:"",cognome:"",dataNascita:"",telefono:"",email:"",cf:"",note:""});}}><I n="check" s={13} /> Salva</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SCHEDA PAZIENTE ──────────────────────────────────────────────────────────
function SchedaPaz({ paziente, piani, preventivi, pacchetti, vendite, utenti, onUpdatePaz, onUpdatePiano, onAddPrev, onUpdatePrev, onAddVendita }) {
  const [tab, setTab] = useState("piano");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({...paziente});
  const [showAddLav, setShowAddLav] = useState(false);
  const [showAddPrev, setShowAddPrev] = useState(false);
  const [showAssegna, setShowAssegna] = useState(false);
  const [lav, setLav] = useState({desc:"",prezzo:"",medico:"Dr. Rossi"});
  const [nuovoPrev, setNuovoPrev] = useState({data:"",voci:[{desc:"",imp:""}],stato:"in_attesa"});
  const [assegna, setAssegna] = useState({pacchettoId:"",venditoreId:"",data:new Date().toISOString().split("T")[0]});

  const toggle = (id) => onUpdatePiano(piani.map(l=>l.id===id?{...l,stato:l.stato==="eseguito"?"da_fare":"eseguito",data:l.stato==="da_fare"?new Date().toISOString().split("T")[0]:null}:l));
  const tot = piani.reduce((s,l)=>s+l.prezzo,0);
  const fatto = piani.filter(l=>l.stato==="eseguito").reduce((s,l)=>s+l.prezzo,0);
  const u = recallUrgency(paziente);
  const sc = paziente.pacchetti.map(pid=>abbScadenza(pid)).filter(Boolean)[0];

  const generaDaPiano = () => {
    const voci = piani.filter(l=>l.stato==="da_fare").map(l=>({desc:l.desc,imp:l.prezzo}));
    if(!voci.length) return;
    const totale = voci.reduce((s,v)=>s+v.imp,0);
    onAddPrev({data:new Date().toISOString().split("T")[0],totale,voci,stato:"in_attesa"});
    setTab("preventivi");
  };

  return (
    <div className="page">
      {/* INFO STRIP */}
      <div className="flex gap2 fac mb4" style={{flexWrap:"wrap"}}>
        <span className="badge bg-gray">{paziente.cf}</span>
        <div className={`score ${scoreBadge(paziente.score)}`} style={{width:"auto",padding:"2px 10px",borderRadius:20,fontSize:12}}>{paziente.score} score</div>
        {u && <span className={`badge ${u.level==="alta"?"bg-red":u.level==="media"?"bg-orange":"bg-green"}`}>Recall {u.level} — {u.label}</span>}
        {sc && <span className={`badge ${sc.color}`}>{sc.stato==="attivo"?"Abbonamento attivo":sc.stato==="scadenza"?`Scade in ${sc.days}gg`:"Abbonamento scaduto"}</span>}
        <span className="lvl-badge lvl-1">L1 AUTO</span>
      </div>

      <div className="g2 mb4">
        {/* DATI */}
        <div className="card">
          <div className="card-header"><span className="card-title">Dati anagrafici</span>
            {editMode?<div className="flex gap2"><button className="btn btn-sm btn-secondary" onClick={()=>{setEditMode(false);setForm({...paziente});}}>Annulla</button><button className="btn btn-sm btn-primary" onClick={()=>{onUpdatePaz(form);setEditMode(false);}}><I n="check" s={12}/>Salva</button></div>
            :<button className="btn btn-sm btn-secondary" onClick={()=>setEditMode(true)}><I n="edit" s={12}/>Modifica</button>}
          </div>
          <div className="card-body">
            {editMode?(
              <><div className="form-row mb3"><div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div><div className="form-group"><label className="form-label">Cognome</label><input className="form-input" value={form.cognome} onChange={e=>setForm({...form,cognome:e.target.value})}/></div></div>
              <div className="form-row mb3"><div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></div><div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div></div>
              <div className="form-group"><label className="form-label">Note</label><textarea className="form-textarea" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div></>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 20px"}}>
                {[["Data nascita",paziente.dataNascita],["Telefono",paziente.telefono],["Email",paziente.email],["Ultima visita",paziente.ultimaVisita]].map(([k,v])=>(
                  <div key={k}><div className="text-xs-muted" style={{marginBottom:3}}>{k}</div><div className="text-sm">{v||"—"}</div></div>
                ))}
                {paziente.note&&<div style={{gridColumn:"1/-1"}}><div className="text-xs-muted" style={{marginBottom:3}}>Note cliniche</div><div style={{fontSize:13,background:"#fffbf0",border:"1px solid #f0e4b0",borderRadius:6,padding:"7px 10px"}}>{paziente.note}</div></div>}
              </div>
            )}
          </div>
        </div>

        {/* PACCHETTI */}
        <div className="card">
          <div className="card-header"><span className="card-title">Pacchetti</span><button className="btn btn-sm btn-primary" onClick={()=>setShowAssegna(true)}><I n="plus" s={12}/>Assegna</button></div>
          <div className="card-body">
            {paziente.pacchetti.length===0&&<div className="text-muted text-sm">Nessun pacchetto</div>}
            {paziente.pacchetti.map(pid=>{
              const pk=pacchetti.find(x=>x.id===pid);
              const sc2=abbScadenza(pid);
              if(!pk) return null;
              return (
                <div key={pid} className="flex fac gap2" style={{padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:pk.colore,flexShrink:0}}/>
                  <div style={{flex:1}}><div className="text-sm font-bold">{pk.nome}</div><div className="text-xs-muted">€{pk.prezzo}{pk.mensile?` · €${pk.mensile}/mese`:""}</div></div>
                  {sc2&&<span className={`badge ${sc2.color}`}>{sc2.stato==="attivo"?"Attivo":sc2.stato==="scadenza"?`${sc2.days}gg`:"Scaduto"}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        {[["piano","Piano di cura"],["preventivi","Preventivi"]].map(([id,l])=>(
          <div key={id} className={`tab${tab===id?" active":""}`} onClick={()=>setTab(id)}>{l}</div>
        ))}
      </div>

      {/* PIANO */}
      {tab==="piano"&&(
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Piano di cura</div><div className="text-xs-muted" style={{marginTop:3}}>€{fatto.toLocaleString("it")} eseguiti / €{tot.toLocaleString("it")} totali</div></div>
            <div className="flex gap2">
              <button className="btn btn-sm btn-secondary" onClick={generaDaPiano}><I n="file" s={12}/>Genera preventivo</button>
              <button className="btn btn-sm btn-primary" onClick={()=>setShowAddLav(true)}><I n="plus" s={12}/>Aggiungi</button>
            </div>
          </div>
          <div className="card-body">
            {piani.length===0&&<div className="empty">Nessun lavoro nel piano</div>}
            {piani.map(l=>(
              <div key={l.id} className={`piano-item${l.stato==="eseguito"?" done":""}`}>
                <div className={`piano-check${l.stato==="eseguito"?" done":" todo"}`} onClick={()=>toggle(l.id)}>
                  {l.stato==="eseguito"&&<I n="check" s={11}/>}
                </div>
                <div style={{flex:1}}>
                  <div className="text-sm" style={{textDecoration:l.stato==="eseguito"?"line-through":"none"}}>{l.desc}</div>
                  <div className="text-xs-muted">{l.medico}{l.data?` · ${l.data}`:""}</div>
                </div>
                <div style={{fontWeight:600,fontSize:13,color:"var(--accent)",minWidth:55,textAlign:"right"}}>€{l.prezzo}</div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>onUpdatePiano(piani.filter(x=>x.id!==l.id))}><I n="trash" s={13}/></button>
              </div>
            ))}
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:13.5}}>
              <span className="text-muted">Totale piano</span><strong>€{tot.toLocaleString("it")}</strong>
            </div>
          </div>
        </div>
      )}

      {/* PREVENTIVI */}
      {tab==="preventivi"&&(
        <div className="card">
          <div className="card-header"><span className="card-title">Preventivi</span>
            <div className="flex gap2">
              <button className="btn btn-sm btn-secondary" onClick={generaDaPiano}><I n="clipboard" s={12}/>Da piano</button>
              <button className="btn btn-sm btn-primary" onClick={()=>setShowAddPrev(true)}><I n="plus" s={12}/>Nuovo</button>
            </div>
          </div>
          <div className="card-body" style={{padding:0}}>
            {preventivi.length===0&&<div className="empty">Nessun preventivo</div>}
            <table>
              <thead><tr><th>Data</th><th>Voci</th><th>Totale</th><th>Stato</th><th>WhatsApp</th></tr></thead>
              <tbody>
                {preventivi.map(pr=>(
                  <tr key={pr.id}>
                    <td className="text-sm">{pr.data}</td>
                    <td className="text-sm text-muted">{pr.voci.map(v=>v.desc).join(", ")}</td>
                    <td><strong>€{pr.totale}</strong></td>
                    <td>
                      <select className="form-select" style={{width:"auto",fontSize:11.5,padding:"3px 7px"}} value={pr.stato} onChange={e=>onUpdatePrev({...pr,stato:e.target.value})}>
                        <option value="in_attesa">In attesa</option>
                        <option value="accettato">Accettato</option>
                        <option value="rifiutato">Rifiutato</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-sm" style={{background:"#DCFCE7",color:"#15803D",border:"1px solid #BBF7D0",gap:5}}>
                        <I n="whatsapp" s={12}/> Invia
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAddLav&&(
        <div className="overlay"><div className="modal">
          <div className="modal-header"><div className="modal-title">Aggiungi lavoro</div><button className="btn btn-ghost btn-icon" onClick={()=>setShowAddLav(false)}><I n="x"/></button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Descrizione *</label><input className="form-input" value={lav.desc} onChange={e=>setLav({...lav,desc:e.target.value})} placeholder="Es. Otturazione 2.6…"/></div>
            <div className="form-row"><div className="form-group"><label className="form-label">Prezzo €</label><input type="number" className="form-input" value={lav.prezzo} onChange={e=>setLav({...lav,prezzo:e.target.value})}/></div><div className="form-group"><label className="form-label">Medico</label><input className="form-input" value={lav.medico} onChange={e=>setLav({...lav,medico:e.target.value})}/></div></div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowAddLav(false)}>Annulla</button><button className="btn btn-primary" onClick={()=>{if(!lav.desc)return;onUpdatePiano([...piani,{...lav,id:Date.now(),prezzo:parseFloat(lav.prezzo)||0,stato:"da_fare",data:null}]);setShowAddLav(false);setLav({desc:"",prezzo:"",medico:"Dr. Rossi"});}}><I n="check" s={13}/>Aggiungi</button></div>
        </div></div>
      )}
      {showAddPrev&&(
        <div className="overlay"><div className="modal modal-lg">
          <div className="modal-header"><div className="modal-title">Nuovo preventivo</div><button className="btn btn-ghost btn-icon" onClick={()=>setShowAddPrev(false)}><I n="x"/></button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Data</label><input type="date" className="form-input" value={nuovoPrev.data} onChange={e=>setNuovoPrev({...nuovoPrev,data:e.target.value})}/></div>
            <div className="section-title" style={{marginBottom:10}}>Voci</div>
            {nuovoPrev.voci.map((v,i)=>(
              <div key={i} className="form-row" style={{marginBottom:8}}>
                <input className="form-input" placeholder="Descrizione" value={v.desc} onChange={e=>{const vs=[...nuovoPrev.voci];vs[i].desc=e.target.value;setNuovoPrev({...nuovoPrev,voci:vs});}}/>
                <input type="number" className="form-input" placeholder="€" value={v.imp} onChange={e=>{const vs=[...nuovoPrev.voci];vs[i].imp=e.target.value;setNuovoPrev({...nuovoPrev,voci:vs});}}/>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={()=>setNuovoPrev({...nuovoPrev,voci:[...nuovoPrev.voci,{desc:"",imp:""}]})}><I n="plus" s={12}/>Voce</button>
            <div style={{marginTop:12,fontWeight:600}}>Totale: €{nuovoPrev.voci.reduce((s,v)=>s+(parseFloat(v.imp)||0),0).toFixed(2)}</div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowAddPrev(false)}>Annulla</button><button className="btn btn-primary" onClick={()=>{const totale=nuovoPrev.voci.reduce((s,v)=>s+(parseFloat(v.imp)||0),0);onAddPrev({...nuovoPrev,totale,voci:nuovoPrev.voci.map(v=>({desc:v.desc,imp:parseFloat(v.imp)||0}))});setShowAddPrev(false);setNuovoPrev({data:"",voci:[{desc:"",imp:""}],stato:"in_attesa"});}}><I n="check" s={13}/>Crea</button></div>
        </div></div>
      )}
      {showAssegna&&(
        <div className="overlay"><div className="modal">
          <div className="modal-header"><div className="modal-title">Assegna pacchetto</div><button className="btn btn-ghost btn-icon" onClick={()=>setShowAssegna(false)}><I n="x"/></button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Pacchetto *</label><select className="form-select" value={assegna.pacchettoId} onChange={e=>setAssegna({...assegna,pacchettoId:parseInt(e.target.value)})}><option value="">Seleziona…</option>{pacchetti.map(pk=><option key={pk.id} value={pk.id}>{pk.nome} — €{pk.prezzo}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Venduto da *</label><select className="form-select" value={assegna.venditoreId} onChange={e=>setAssegna({...assegna,venditoreId:parseInt(e.target.value)})}><option value="">Seleziona…</option>{utenti.map(u=><option key={u.id} value={u.id}>{u.nome} ({u.ruolo})</option>)}</select></div>
            <div className="form-group"><label className="form-label">Data</label><input type="date" className="form-input" value={assegna.data} onChange={e=>setAssegna({...assegna,data:e.target.value})}/></div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowAssegna(false)}>Annulla</button><button className="btn btn-primary" onClick={()=>{if(!assegna.pacchettoId||!assegna.venditoreId)return;const pk=pacchetti.find(x=>x.id===assegna.pacchettoId);onAddVendita({...assegna,importo:pk?.prezzo||0,pazienteId:paziente.id});setShowAssegna(false);}}><I n="check" s={13}/>Conferma</button></div>
        </div></div>
      )}
    </div>
  );
}

// ─── PIANI PAGE ───────────────────────────────────────────────────────────────
function PianiPage({ pazienti, piani, onOpen }) {
  return (
    <div className="page">
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paziente</th><th>Lavori</th><th>Eseguiti</th><th>Da fare</th><th>Residuo</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {pazienti.map(p=>{
                const ll=piani[p.id]||[];
                if(!ll.length) return null;
                const eseg=ll.filter(l=>l.stato==="eseguito").length;
                const res=ll.filter(l=>l.stato==="da_fare").reduce((s,l)=>s+l.prezzo,0);
                return (
                  <tr key={p.id} className="clickable" onClick={()=>onOpen(p)}>
                    <td><strong>{p.cognome} {p.nome}</strong></td>
                    <td>{ll.length}</td>
                    <td><span className="badge bg-green">{eseg}</span></td>
                    <td><span className="badge bg-orange">{ll.length-eseg}</span></td>
                    <td><strong>€{res.toLocaleString("it")}</strong></td>
                    <td><div className={`score ${scoreBadge(p.score)}`}>{p.score}</div></td>
                    <td><button className="btn btn-sm btn-secondary" onClick={e=>{e.stopPropagation();onOpen(p);}}>Apri</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AGENDA PAGE ─────────────────────────────────────────────────────────────
function AgendaPage({ appuntamenti, pazienti, onUpdate, onAdd }) {
  const ore = ["09:00","09:30","10:00","10:30","11:00","11:30","15:00","15:30","16:00","16:30","17:00","17:30"];
  const riuniti = ["Riunito 1","Riunito 2","Estetica"];
  const tipoClass = { igiene:"slot-igiene", produzione:"slot-produzione", estetica:"slot-estetica", acquisizione:"slot-acquisizione", no_show:"slot-noshoww" };
  const tipoLabel = { igiene:"Igiene", produzione:"Produzione", estetica:"Estetica", acquisizione:"Acquisizione", no_show:"No-show" };

  const getApp = (ora, riunito) => appuntamenti.find(a => a.start === ora && a.riunito === riunito && a.data === "2026-05-18");

  const showRate = Math.round((appuntamenti.filter(a=>a.stato==="confermato").length / appuntamenti.length)*100);
  const noShow   = appuntamenti.filter(a=>a.stato==="no_show").length;

  return (
    <div className="page">
      <div className="flex gap2 fac mb4" style={{flexWrap:"wrap"}}>
        <span className="badge bg-green">Show rate: {showRate}%</span>
        <span className="badge bg-red">{noShow} no-show oggi</span>
        <span className="badge bg-blue">{appuntamenti.filter(a=>a.stato==="confermato").length} confermati</span>
        <span className="lvl-badge lvl-2 pulse">L2 AGENDA LIVE</span>
      </div>

      <div className="card mb4">
        <div className="card-header"><span className="card-title">Agenda oggi — Lunedì 18 maggio 2026</span></div>
        <div className="card-body" style={{padding:0,overflowX:"auto"}}>
          <div className="agenda-grid" style={{minWidth:520}}>
            <div className="agenda-header">Ora</div>
            {riuniti.map(r=><div key={r} className="agenda-header">{r}</div>)}
            {ore.map(ora=>(
              <>
                <div key={`t-${ora}`} className="agenda-time">{ora}</div>
                {riuniti.map(riunito=>{
                  const app = getApp(ora, riunito);
                  const paz = app ? pazienti.find(p=>p.id===app.pazienteId) : null;
                  return (
                    <div key={`${ora}-${riunito}`} className="agenda-cell" style={{height:48}}>
                      {app && paz && (
                        <div className={`agenda-slot ${tipoClass[app.stato==="no_show"?"no_show":app.tipo]}`}>
                          <div style={{fontWeight:600}}>{paz.cognome}</div>
                          <div style={{opacity:.8}}>{tipoLabel[app.tipo]}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <div className="g3">
        {[{label:"Igiene",class:"slot-igiene",count:appuntamenti.filter(a=>a.tipo==="igiene").length},{label:"Produzione",class:"slot-produzione",count:appuntamenti.filter(a=>a.tipo==="produzione").length},{label:"Estetica",class:"slot-estetica",count:appuntamenti.filter(a=>a.tipo==="estetica").length}].map(t=>(
          <div key={t.label} className="card">
            <div className="card-body" style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontFamily:"var(--font-display)",marginBottom:4}}>{t.count}</div>
              <span className={`agenda-slot ${t.class}`} style={{position:"static",inset:"unset",display:"inline-block",padding:"2px 10px",borderRadius:20,borderLeft:"none",fontSize:12}}>{t.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RECALL PAGE ─────────────────────────────────────────────────────────────
function RecallPage({ recallList, onOpen }) {
  const [filter, setFilter] = useState("tutti");
  const filtered = filter==="tutti" ? recallList : recallList.filter(p=>{
    const u=recallUrgency(p);
    return u&&u.level===filter;
  });

  return (
    <div className="page">
      <div className="stats-grid" style={{marginBottom:18}}>
        {[["Alta urgenza",recallList.filter(p=>recallUrgency(p)?.level==="alta").length,"c-red",">12 mesi"],["Media urgenza",recallList.filter(p=>recallUrgency(p)?.level==="media").length,"c-warn","9-12 mesi"],["Bassa urgenza",recallList.filter(p=>recallUrgency(p)?.level==="bassa").length,"c-green","6-9 mesi"],["Score medio",Math.round(recallList.reduce((s,p)=>s+p.score,0)/Math.max(recallList.length,1)),"c-purple","priorità media"],].map(([l,v,c,s])=>(
        <div key={l} className={`stat ${c}`}><div className="stat-label">{l}</div><div className="stat-val">{v}</div><div className="stat-sub">{s}</div></div>
      ))}
      </div>

      <div className="tabs">
        {[["tutti","Tutti"],["alta","Alta urgenza"],["media","Media"],["bassa","Bassa"]].map(([id,l])=>(
          <div key={id} className={`tab${filter===id?" active":""}`} onClick={()=>setFilter(id)}>{l}</div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex fac gap2"><span className="card-title">Lista recall</span><span className="lvl-badge lvl-1">L1 AUTOMATICO</span></div>
          <span className="text-xs-muted">{filtered.length} pazienti</span>
        </div>
        <div className="card-body">
          {filtered.map(p=>{
            const u=recallUrgency(p);
            return (
              <div key={p.id} className="recall-item" onClick={()=>onOpen(p)}>
                <div className="recall-urgency" style={{background:u.color}}/>
                <div style={{flex:1}}>
                  <div className="text-sm font-bold">{p.cognome} {p.nome}</div>
                  <div className="text-xs-muted">Ultima visita: {p.ultimaVisita} — {u.label}</div>
                </div>
                <div className={`score ${scoreBadge(p.score)}`}>{p.score}</div>
                <span className={`badge ${u.level==="alta"?"bg-red":u.level==="media"?"bg-orange":"bg-green"}`}>{u.level}</span>
                <button className="btn btn-sm" style={{background:"#DCFCE7",color:"#15803D",border:"1px solid #BBF7D0",gap:5}} onClick={e=>{e.stopPropagation();}}>
                  <I n="whatsapp" s={12}/>Richiama
                </button>
              </div>
            );
          })}
          {filtered.length===0&&<div className="empty">Nessun paziente in questa categoria</div>}
        </div>
      </div>
    </div>
  );
}

// ─── PREVENTIVI PAGE ──────────────────────────────────────────────────────────
function PreventiviPage({ preventivi, pazienti, prevScaduti, onUpdate }) {
  const [filter,setFilter]=useState("tutti");
  const filtered=filter==="tutti"?preventivi:preventivi.filter(p=>p.stato===filter);

  return (
    <div className="page">
      {prevScaduti.length>0&&<div className="alert-banner mb4">⚠️ {prevScaduti.length} preventivi in attesa da più di 7 giorni — follow-up necessario</div>}
      <div className="stats-grid" style={{gridTemplateColumns:"repeat(3,1fr)",marginBottom:18}}>
        <div className="stat c-warn"><div className="stat-label">In attesa</div><div className="stat-val">€{preventivi.filter(p=>p.stato==="in_attesa").reduce((s,p)=>s+p.totale,0).toLocaleString("it")}</div></div>
        <div className="stat c-green"><div className="stat-label">Accettati</div><div className="stat-val">€{preventivi.filter(p=>p.stato==="accettato").reduce((s,p)=>s+p.totale,0).toLocaleString("it")}</div></div>
        <div className="stat c-red"><div className="stat-label">Rifiutati</div><div className="stat-val">€{preventivi.filter(p=>p.stato==="rifiutato").reduce((s,p)=>s+p.totale,0).toLocaleString("it")}</div></div>
      </div>
      <div className="tabs">{[["tutti","Tutti"],["in_attesa","In attesa"],["accettato","Accettati"],["rifiutato","Rifiutati"]].map(([id,l])=><div key={id} className={`tab${filter===id?" active":""}`} onClick={()=>setFilter(id)}>{l}</div>)}</div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paziente</th><th>Data</th><th>Giorni attesa</th><th>Totale</th><th>Stato</th><th>WhatsApp L3</th></tr></thead>
            <tbody>
              {filtered.map(pr=>{
                const paz=pazienti.find(p=>p.id===pr.pazienteId);
                const giorni=daysAgo(pr.data);
                return (
                  <tr key={pr.id}>
                    <td><strong>{paz?.cognome} {paz?.nome}</strong></td>
                    <td className="text-sm">{pr.data}</td>
                    <td>{pr.stato==="in_attesa"?<span className={`badge ${giorni>7?"bg-red":giorni>3?"bg-orange":"bg-gray"}`}>{giorni}gg</span>:<span className="text-xs-muted">—</span>}</td>
                    <td><strong>€{pr.totale}</strong></td>
                    <td><select className="form-select" style={{width:"auto",fontSize:11.5,padding:"3px 7px"}} value={pr.stato} onChange={e=>onUpdate({...pr,stato:e.target.value})}><option value="in_attesa">In attesa</option><option value="accettato">Accettato</option><option value="rifiutato">Rifiutato</option></select></td>
                    <td>{pr.stato==="in_attesa"&&<button className="btn btn-sm" style={{background:"#DCFCE7",color:"#15803D",border:"1px solid #BBF7D0",gap:5}}><I n="whatsapp" s={12}/>Followup</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── PACCHETTI PAGE ───────────────────────────────────────────────────────────
function PacchettiPage({ pacchetti, onAdd, onDelete }) {
  const [showModal,setShowModal]=useState(false);
  const [form,setForm]=useState({nome:"",descrizione:"",prezzo:"",rate:"",mensile:"",colore:"#2B5741",prestazioni:[""]});
  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}><I n="plus" s={13}/>Nuovo pacchetto</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {pacchetti.map(pk=>(
          <div key={pk.id} className="pacchetto-card">
            <div className="pacchetto-head" style={{background:pk.colore}}>
              <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{pk.nome}</div>
              <div style={{fontSize:22,fontWeight:700,fontFamily:"var(--font-display)",marginTop:10}}>€{pk.prezzo}{pk.mensile&&<span style={{fontSize:13,opacity:.8,fontWeight:400}}> · €{pk.mensile}/mese</span>}</div>
            </div>
            <div className="pacchetto-body">
              {pk.prestazioni.map((f,i)=><div key={i} className="pacchetto-feat"><span style={{color:"var(--accent)"}}>✓</span>{f}</div>)}
              <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
                <button className="btn btn-danger btn-sm" onClick={()=>onDelete(pk.id)}><I n="trash" s={12}/>Elimina</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showModal&&(
        <div className="overlay"><div className="modal modal-lg">
          <div className="modal-header"><div className="modal-title">Nuovo pacchetto</div><button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}><I n="x"/></button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Descrizione</label><textarea className="form-textarea" rows={2} value={form.descrizione} onChange={e=>setForm({...form,descrizione:e.target.value})}/></div>
            <div className="form-row3 mb3">
              <div className="form-group"><label className="form-label">Prezzo €</label><input type="number" className="form-input" value={form.prezzo} onChange={e=>setForm({...form,prezzo:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Rate mensili</label><input type="number" className="form-input" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">€/mese</label><input type="number" className="form-input" value={form.mensile} onChange={e=>setForm({...form,mensile:e.target.value})}/></div>
            </div>
            <div className="form-group"><label className="form-label">Colore</label><input type="color" className="form-input" style={{height:40}} value={form.colore} onChange={e=>setForm({...form,colore:e.target.value})}/></div>
            <div className="section-title">Prestazioni incluse</div>
            {form.prestazioni.map((f,i)=><div key={i} className="form-group"><input className="form-input" placeholder="Es. Detartrasi x2" value={f} onChange={e=>{const p=[...form.prestazioni];p[i]=e.target.value;setForm({...form,prestazioni:p});}}/></div>)}
            <button className="btn btn-secondary btn-sm" onClick={()=>setForm({...form,prestazioni:[...form.prestazioni,""]})}><I n="plus" s={12}/>Prestazione</button>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Annulla</button><button className="btn btn-primary" onClick={()=>{if(!form.nome||!form.prezzo)return;onAdd({...form,prezzo:parseFloat(form.prezzo),rate:form.rate?parseInt(form.rate):null,mensile:form.mensile?parseFloat(form.mensile):null,prestazioni:form.prestazioni.filter(Boolean),scadenza:"2027-12-31"});setShowModal(false);setForm({nome:"",descrizione:"",prezzo:"",rate:"",mensile:"",colore:"#2B5741",prestazioni:[""]});}}><I n="check" s={13}/>Salva</button></div>
        </div></div>
      )}
    </div>
  );
}

// ─── PREMI PAGE ───────────────────────────────────────────────────────────────
function PremiPage({ vendite, utenti, pacchetti, pazienti }) {
  const byVend = utenti.map(u=>({ ...u, mie:vendite.filter(v=>v.venditoreId===u.id), tot:vendite.filter(v=>v.venditoreId===u.id).reduce((s,v)=>s+v.importo,0) })).sort((a,b)=>b.tot-a.tot);
  const maxT = Math.max(...byVend.map(u=>u.tot),1);
  return (
    <div className="page">
      <div className="stats-grid" style={{marginBottom:18}}>
        <div className="stat c-green"><div className="stat-label">Vendite totali</div><div className="stat-val">{vendite.length}</div><div className="stat-sub">pacchetti</div></div>
        <div className="stat c-blue"><div className="stat-label">Ricavi pacchetti</div><div className="stat-val">€{vendite.reduce((s,v)=>s+v.importo,0).toLocaleString("it")}</div></div>
        <div className="stat c-warn"><div className="stat-label">Top venditore</div><div className="stat-val">{byVend[0]?.nome.split(" ")[0]}</div><div className="stat-sub">{byVend[0]?.mie.length} vendite</div></div>
        <div className="stat c-purple"><div className="stat-label">Media/venditore</div><div className="stat-val">€{Math.round(vendite.reduce((s,v)=>s+v.importo,0)/utenti.length)}</div></div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="card-header"><span className="card-title">Classifica venditori</span></div>
          <div className="card-body">
            {byVend.map((u,i)=>(
              <div key={u.id} className="flex fac gap2" style={{padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                <div className={`rank-num${i===0?" gold":""}`}>{i+1}</div>
                <div style={{flex:1}}><div className="text-sm font-bold">{u.nome}</div><div className="text-xs-muted">{u.ruolo} · {u.mie.length} vendite</div></div>
                <div className="rank-bar"><div className="rank-fill" style={{width:`${(u.tot/maxT)*100}%`}}/></div>
                <strong style={{fontSize:13.5,color:"var(--accent)",minWidth:60,textAlign:"right"}}>€{u.tot.toLocaleString("it")}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Dettaglio vendite</span></div>
          <div className="card-body" style={{padding:0}}>
            <table>
              <thead><tr><th>Data</th><th>Pacchetto</th><th>Paziente</th><th>Venditore</th><th>€</th></tr></thead>
              <tbody>
                {vendite.sort((a,b)=>b.data.localeCompare(a.data)).map(v=>{
                  const pk=pacchetti.find(x=>x.id===v.pacchettoId);
                  const paz=pazienti.find(x=>x.id===v.pazienteId);
                  const vend=utenti.find(x=>x.id===v.venditoreId);
                  return (<tr key={v.id}><td className="text-xs-muted">{v.data}</td><td className="text-sm">{pk?.nome?.split(" ").slice(0,2).join(" ")}</td><td className="text-sm">{paz?.cognome}</td><td className="text-xs-muted">{vend?.nome?.split(" ").slice(-1)}</td><td><strong>€{v.importo}</strong></td></tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FATTURAZIONE PAGE ────────────────────────────────────────────────────────
function FattPage({ preventivi, pazienti, onUpdate }) {
  const [syncing,setSyncing]=useState(false);
  const [syncOk,setSyncOk]=useState(false);
  const accettati=preventivi.filter(p=>p.stato==="accettato");
  const sync=()=>{setSyncing(true);setTimeout(()=>{setSyncing(false);setSyncOk(true);setTimeout(()=>setSyncOk(false),3000)},1800)};
  return (
    <div className="page">
      <div className="genya-bar">
        <div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:5}}>Genya One Click</div>
          <div className="flex fac gap2" style={{fontSize:12.5,opacity:.85}}>
            <span className={`dot ${syncOk?"dot-green":"dot-yellow"} pulse`}/>
            {syncOk?"Sincronizzazione completata ✓":"In attesa di sincronizzazione"}
          </div>
          <div style={{fontSize:11,opacity:.4,marginTop:5}}>API REST · GDPR compliant · L4 automazione</div>
        </div>
        <div className="flex fac gap2">
          <span className="lvl-badge lvl-4">L4 AUTO</span>
          <button className="btn" style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)"}} onClick={sync}>
            {syncing?<span className="pulse">Sync in corso…</span>:<><I n="genya" s={13}/>Sincronizza Genya</>}
          </button>
        </div>
      </div>

      <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 14px",fontSize:12.5,color:"#B45309",marginBottom:18}}>
        <strong>L4 — Automazione attiva a regime:</strong> ogni preventivo accettato genererà automaticamente una bozza fattura in Genya ogni ora. Nessun click manuale necessario.
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Preventivi pronti per fatturazione</span><span className="badge bg-green">{accettati.length} da fatturare</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paziente</th><th>CF</th><th>Data</th><th>Importo</th><th>Voci</th><th>Genya</th></tr></thead>
            <tbody>
              {accettati.map(pr=>{
                const paz=pazienti.find(p=>p.id===pr.pazienteId);
                return (
                  <tr key={pr.id}>
                    <td><strong>{paz?.cognome} {paz?.nome}</strong></td>
                    <td className="text-xs-muted">{paz?.cf}</td>
                    <td className="text-sm">{pr.data}</td>
                    <td><strong>€{pr.totale.toLocaleString("it")}</strong></td>
                    <td className="text-xs-muted">{pr.voci.map(v=>v.desc).join(", ")}</td>
                    <td><button className="btn btn-sm btn-primary" onClick={sync}><I n="invoice" s={12}/>Invia</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
