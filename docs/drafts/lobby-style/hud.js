// 전투 화면 HUD (가로) — 새 화풍
function battleHud(root) {
  root.insertAdjacentHTML('beforeend', `
<style>
  .hbar { position: absolute; left: 150px; top: 14px; width: 980px; height: 54px; display: flex; align-items: center; gap: 14px; padding: 0 12px 0 26px; }
  .hbar .gt { font-size: 26px; } .hbar .sub { font-size: 13px; color: var(--mint); } .hbar .sep { width: 2px; height: 28px; background: #2f8a7c; }
  .hbar .v { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px; } .hbar .v i { font-size: 20px; color: #ffe27a; } .hbar .v.t { font-size: 14px; font-weight: 400; } .hbar .v.t i { color: var(--mint); font-size: 17px; }
  .hbar .now { height: 34px; padding: 0 16px; font-size: 14px; border-radius: 99px; box-shadow: 0 3px 0 #9a6610, inset 0 2px 0 rgba(255,255,255,.6); }
  .hbar .rel { display: flex; gap: 6px; margin-left: auto; } .hbar .rel span { width: 34px; height: 34px; border-radius: 50%; background: #0b3a3c; border: 2px solid #2f8a7c; display: grid; place-items: center; } .hbar .rel span.on { border-color: #ffd34d; background: #1c5552; } .hbar .rel img { width: 22px; height: 22px; }
  .hban { position: absolute; left: 50%; top: 74px; transform: translateX(-50%); height: 34px; padding: 0 22px; display: flex; align-items: center; gap: 10px; font-size: 13px; white-space: nowrap; } .hban b { font-size: 16px; color: #1f7a6c; }
  .hdock { position: absolute; left: 290px; top: 640px; width: 700px; height: 70px; border-radius: 24px; display: flex; align-items: center; gap: 10px; padding: 0 10px; }
  .hcard { width: 318px; height: 54px; border-radius: 16px; background: #0b3a3c; border: 2px solid #1f6f66; display: flex; align-items: center; gap: 9px; padding: 0 8px 0 6px; }
  .hcard .por { width: 42px; height: 42px; border-radius: 50%; background: #f3e9c9; border: 2px solid #4fb06a; display: grid; place-items: center; flex: none; } .hcard .por img { width: 32px; height: 32px; }
  .hcard b { font-size: 14px; color: #8fe3a4; display: block; line-height: 1.2; } .hcard small { font-size: 11px; color: var(--mint); display: block; line-height: 1.3; white-space: nowrap; } .hcard small.s { color: var(--cream); }
  .hcard .bs { margin-left: auto; display: flex; flex-direction: column; gap: 4px; } .hcard .bs .btn { width: 70px; height: 22px; font-size: 11px; border-radius: 99px; box-shadow: none; border-width: 1.5px; }
  .hhire { width: 204px; height: 50px; font-size: 18px; border-radius: 18px; box-shadow: 0 4px 0 #9a6610, inset 0 2px 0 rgba(255,255,255,.6); }
  .hsm { width: 46px; height: 50px; border-radius: 14px; flex-direction: column; gap: 1px; font-size: 11px; box-shadow: 0 3px 0 #0b3a3c, inset 0 1px 0 rgba(255,255,255,.3); } .hsm i { font-size: 17px; }
  .htoast { position: absolute; left: 50%; top: 609px; transform: translateX(-50%); height: 30px; padding: 0 18px; display: flex; align-items: center; font-size: 13px; font-weight: 700; white-space: nowrap; box-shadow: 0 3px 0 #bfa970, 0 6px 14px rgba(2,20,22,.4); }
</style>
<div class="hbar dk pill"><span class="gt" data-t="WAVE 3">WAVE 3</span><span class="sub">초원 · 다음 54기 · 최고 W32</span><span class="sep"></span>
  <span class="v t"><i class="ic" data-i="clock"></i>다음 24초</span><button class="btn gold now">바로 시작</button>
  <span class="v"><i class="ic" data-i="crown" style="display:none"></i><span class="coin c-fame" style="width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:13px;color:#6b4505">G</span>969</span>
  <span class="v"><i class="ic" data-i="skull" style="color:#cdeedd"></i>12 / 100</span>
  <span class="rel"><span class="on"><img class="px" src="spr/relic_red_orb.png"></span><span class="on"><img class="px" src="spr/relic_golden_grail.png"></span><span></span><span></span></span></div>
<div class="hban lt pill"><b>WAVE 3</b>몬스터 54기 · 레드 · 블루</div>
<div class="htoast lt pill">궁수 로빈 합류!</div>
<div class="hdock dk">
  <div class="hcard"><span class="por"><img class="px" src="spr/merc_archer_green.png"></span><span><b>로빈</b><small>Lv.2 커먼 · 그린 · 레벨업 40G</small><small class="s">공격 14 · 공속 1.40 · 사거리 220</small></span>
    <span class="bs"><button class="btn teal">스킬</button><button class="btn cream">판매 +15G</button></span></div>
  <button class="btn gold hhire"><i class="ic" data-i="plus"></i>용병 고용 · 30 G</button>
  <button class="btn teal hsm"><i class="ic" data-i="play"></i>x1</button><button class="btn teal hsm"><i class="ic" data-i="pause"></i>정지</button><button class="btn teal hsm"><i class="ic" data-i="menu"></i>메뉴</button>
</div>`);
}
