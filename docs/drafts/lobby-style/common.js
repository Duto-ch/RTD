const TAGS = {
  tower: ['node', '성탑', '스킬 노드', 3], tent: ['ticket', '모집 천막', '용병 모집', 1], barracks: ['people', '병영', '덱 편성 · 장비 장착'],
  forge: ['anvil', '대장간', '장비 강화', 2], gate: ['sword', '성문', '출전']
};
function makeTags(layout, root, scale = 1) {
  for (const it of layout.items) {
    if (!it.tag || !TAGS[it.t]) continue; const [ic, name, sub, dot] = TAGS[it.t];
    const d = document.createElement('div'); d.className = 'tag lt pill'; d.style.left = it.tag[0] + 'px'; d.style.top = it.tag[1] + 'px';
    d.innerHTML = `<span class="ico"><i class="ic" data-i="${ic}"></i></span><span><b>${name}</b><small>${sub}</small></span>${dot ? `<span class="dot">${dot}</span>` : ''}`;
    root.appendChild(d);
  }
}
// 시안용 덱: [그림, 등급(1 커먼~4 유니크), 속성]
const DECK = [['merc_archer_red', 1, 'r'], ['merc_rogue_blue', 1, 'b'], ['merc_shaman_green', 1, 'g'], ['merc_mage_blue', 2, 'b'], ['merc_sniper_red', 2, 'r'], ['merc_archer_green', 2, 'g'], ['merc_sniper_blue', 3, 'b'], ['hero_isolde', 4, 'r']];
function slotHtml([k, g, a]) { return `<div class="slot g${g}"><span class="a ${a}"></span><img class="px" src="spr/${k}.png"></div>`; }
function makeDeck(root, list = DECK) { root.innerHTML = list.map(slotHtml).join(''); }
