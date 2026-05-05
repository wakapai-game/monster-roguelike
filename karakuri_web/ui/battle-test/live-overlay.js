let _initialized = false;

export function initLiveOverlay() {
  if (_initialized) return;
  _initialized = true;
  document.addEventListener('battle-attack-resolved', _onAttack);
}

function _onAttack(e) {
  const { result, defender, playerNum, defender_was_defending } = e.detail;
  _appendDmgLog(result, defender_was_defending);
  _updateEnSummary(result, defender, playerNum);
}

function _appendDmgLog(result, wasDefending) {
  const el = document.getElementById('test-dmg-log');
  if (!el) return;

  const c = result.calc || {};
  const stab = c.is_stab ? '<span style="color:#fde68a;">STAB</span>' : '-';
  const weak = result.is_weakness ? '<span style="color:#f87171;">弱点</span>' : '-';
  const defMod = wasDefending ? ' <span style="color:#93c5fd;">(防御×0.5)</span>' : '';

  const entry = document.createElement('div');
  entry.style.cssText = 'border-bottom:1px solid #164e63; padding-bottom:3px; margin-bottom:3px;';
  entry.innerHTML = [
    `<b>[${result.skill ?? '?'}]</b> STAB:${stab} 弱点:${weak}${defMod}`,
    `base_pow=${c.base_pow ?? '-'} effPow=${c.effPow != null ? c.effPow.toFixed(1) : '-'}`,
    `atk=${c.atk != null ? c.atk.toFixed(1) : '-'} def=${c.def != null ? c.def.toFixed(1) : '-'} aff=×${c.aff ?? '-'}`,
    `pow_atk=${c.pow_atk != null ? c.pow_atk.toFixed(0) : '-'} en_def=${c.en_def != null ? c.en_def.toFixed(0) : '-'}`,
    `→ EN:-${result.en_damage ?? result.st_damage ?? 0} HP:-${result.hp_damage ?? 0}`,
    `cost=${result.cost_total ?? result.cost ?? '-'}`,
  ].join(' &nbsp;│&nbsp; ');

  el.prepend(entry);
  while (el.children.length > 12) el.removeChild(el.lastChild);
}

function _updateEnSummary(result, defender, playerNum) {
  const el = document.getElementById('test-en-summary');
  if (!el) return;

  const enDealt = result.en_damage ?? result.st_damage ?? 0;
  const remainEn = defender.current_en ?? defender.current_st ?? 0;
  const hitsToPurge = enDealt > 0 ? Math.ceil(remainEn / enDealt) : '∞';

  el.innerHTML =
    `<span style="color:#a78bfa;">P${playerNum}</span>` +
    ` 与EN削り: <b>${enDealt}</b> &nbsp;│&nbsp;` +
    ` 敵残EN: <b>${remainEn}</b> &nbsp;│&nbsp;` +
    ` 次パージまで: あと<b>${hitsToPurge}</b>発` +
    ` &nbsp;│&nbsp; HP:-<b>${result.hp_damage ?? 0}</b>`;
}
