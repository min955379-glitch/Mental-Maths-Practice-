(function () {
  'use strict';
  function normSpace(s) { return (s==null?'':String(s)).trim().replace(/\s+/g,' '); }
  function stripTrailingPunct(s) { return s.replace(/[.,;:]+$/, ''); }
  function parseFraction(s) { const m = String(s).match(/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/); if(!m)return null; const a=parseInt(m[1],10); const b=parseInt(m[2],10); if(b===0)return null; return [a,b]; }
  function gcd(a,b){return b===0?Math.abs(a):gcd(b,a%b);}
  function simpFrac(a,b){const g=gcd(a,b);return [a/g,b/g];}
  function parseNumber(s) { if(s==null)return null; let t=String(s).trim(); if(t==='')return null; t=t.replace(/,/g,''); if(!/^-?\d+\/\d+$/.test(t) && !/^-?\d*\.\d+$/.test(t) && !/^-?\d+$/.test(t))return null; if(/^-?\d+\/\d+$/.test(t))return null; const n=Number(t); if(!Number.isFinite(n))return null; return n; }
  function stripUnit(s,unit){if(!unit)return s; const esc=unit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); return s.replace(new RegExp('\\s*'+esc+'\\s*$','i'),'').trim();}
  function normalizeTime(s){const t=normSpace(s).toLowerCase(); if(t==='noon'||t==='12 noon')return '12:00'; if(t==='midnight'||t==='12 midnight')return '00:00'; let m=t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/); if(m){let h=parseInt(m[1],10); const min=m[2]||'00'; const ampm=m[3]; if(ampm==='pm'&&h<12)h+=12; if(ampm==='am'&&h===12)h=0; return String(h).padStart(2,'0')+':'+min;} m=t.match(/^(\d{1,2}):(\d{2})$/); if(m)return m[1].padStart(2,'0')+':'+m[2]; return null;}
  function isPercent(s){return /%$/.test(s)||/percent/i.test(s);}
  function stripPercent(s){return s.replace(/\s*(%|percent)\s*$/i,'').trim();}
  function canonicalize(raw,expectedUnit){let s=normSpace(stripTrailingPunct(raw)); if(expectedUnit)s=stripUnit(s,expectedUnit); s=normSpace(s); return s;}
  function numericEqual(a,b,eps){eps=eps==null?1e-6:eps; return Math.abs(a-b)<eps;}
  function compareAnswers(userInput, expected) {
    if (userInput==null) return false;
    const rawUser = normSpace(String(userInput));
    if (rawUser==='') return false;
    const expectedAnswer = expected.correctAnswer;
    const acceptedAnswers = expected.acceptedAnswers || [];
    const unit = expected.unit || '';
    const acceptedCanonical = [expectedAnswer, ...acceptedAnswers].map(a => canonicalize(a, ''));
    const userCanon = canonicalize(rawUser, '');
    if (acceptedCanonical.map(c => c.toLowerCase()).includes(userCanon.toLowerCase())) return true;
    const expectedTime = expectedAnswer.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) || expectedAnswer.match(/^(\d{1,2}):(\d{2})$/);
    const userTime = normalizeTime(rawUser);
    if (expectedTime && userTime) { const expNorm = normalizeTime(expectedAnswer.replace(/noon|midnight/i, m => m==='noon'?'12:00':'00:00')); if (expNorm && userTime===expNorm) return true; }
    let userStripped = rawUser; let expectedStripped = expectedAnswer;
    if (isPercent(userStripped) || isPercent(expectedStripped)) {
      userStripped = stripPercent(userStripped); expectedStripped = stripPercent(expectedStripped);
      const u = parseNumber(userStripped); const e = parseNumber(expectedStripped);
      if (u!=null && e!=null && numericEqual(u,e)) return true;
    }
    const userFrac = parseFraction(rawUser) || parseFraction(userStripped);
    const expFrac = parseFraction(expectedAnswer) || parseFraction(expectedStripped);
    if (userFrac && expFrac) { const u=simpFrac(userFrac[0],userFrac[1]); const e=simpFrac(expFrac[0],expFrac[1]); if(u[0]*e[1]===e[0]*u[1]) return true; }
    const uNum = parseNumber(userCanon)!=null ? parseNumber(userCanon) : parseNumber(stripUnit(rawUser,unit));
    const eNum = parseNumber(canonicalize(expectedAnswer,''));
    if (uNum!=null && eNum!=null && numericEqual(uNum,eNum)) return true;
    const uNumUnitless = parseNumber(stripUnit(rawUser,unit));
    if (uNumUnitless!=null && eNum!=null && numericEqual(uNumUnitless,eNum)) return true;
    return false;
  }
  window.Normalize = { compareAnswers, normalizeTime, parseFraction, parseNumber };
})();
