import { PX, BALANCE } from '../../config.js';
import { basicMul } from '../../data/roster.js';
import { RAGE_MAX } from '../../data/synergy.js';
import { STONES } from '../../data/tavern.js';
import { playOnce, setFacing, hitDelay, cancelOnce } from '../../systems/customArt.js';
import { audio } from '../../systems/audio.js';
import { FAME } from '../../data/upgrades.js';
import { d2 } from './util.js';

/** 전투: 용병 공격 주기 · 기본 공격 · 피해 · 관통 · 처치 보상 */
export class Combat {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
  }

  monstersInRange(x, y, range) {
    const r2 = range * range;
    const out = [];
    for (const m of this.scene.monsters) {
      if (!m.alive) continue;
      const dd = (m.x - x) ** 2 + (m.y - y) ** 2;
      if (dd <= r2) out.push({ m, dd });
    }
    return out.sort((a, b) => a.dd - b.dd).map((o) => o.m);
  }

  updateMercs(dt) {
    const now = this.scene.gameTime;
    for (const merc of this.scene.mercs) {
      if (merc.dragging) continue;
      const st = merc.getStats(this.scene.relics, now);
      const deb = st.debuff;
      merc.sprite.setTint(deb.list.length ? (deb.stun ? 0x7a6a9a : 0xc89cff) : now < (merc.buffFlashUntil || 0) ? 0xfff2a0 : 0xffffff);
      // 상태 표시: 버프·디버프가 남아 있는 동안 계속 붙어 있고, 끝나면 떨어진다
      this.scene.vfx.setStatus(merc, 'buff', st.buffed);
      this.scene.vfx.setStatus(merc, 'debuff', deb.list.length > 0);
      if (deb.stun) continue; // 공포: 공격·스킬·쿨타임 모두 정지
      const inRange = this.monstersInRange(merc.x, merc.y, st.range);

      // 기본 공격 — 휘두름·발사 전에 노린 몬스터가 모두 죽으면 공격 동작을 끊고 바로 다음 대상을 노린다 (2026-11-20)
      const p = merc.pendingHit;
      if (p && p.targets.every((m) => !m.alive)) {
        p.timer.remove(false);
        merc.pendingHit = null;
        cancelOnce(merc.sprite, 'idle');
        merc.cooldown = 0;
      }
      merc.cooldown -= dt;
      if (merc.cooldown > 0) continue;
      const live = inRange.filter((m) => m.alive);
      if (!live.length) {
        merc.cooldown = 0;
        continue;
      }
      merc.cooldown = 1 / st.rate;
      // 대상 쪽을 바라본다 (거의 위·아래에 있으면 방향 유지)
      const dx = live[0].x - merc.x;
      if (Math.abs(dx) > 8) setFacing(merc.sprite, dx < 0);
      // 스킬: 마나가 가득 차면 이번 공격 대신 스킬 (룰 v2, TFT 식 — 침묵 중엔 못 쓰고 마나는 그대로)
      if (merc.mana >= merc.maxMana && !deb.silence && this.canCast(merc.def, inRange)) {
        merc.mana = 0;
        this.atHitFrame(merc, st, () => {
          const st2 = merc.getStats(this.scene.relics, this.scene.gameTime);
          const inR = this.monstersInRange(merc.x, merc.y, st2.range);
          if (!this.scene.castSkill(merc, merc.def, st2, inR)) return;
          // 마탑 9: 확률로 스킬 두 번
          if (st2.doubleCast && Math.random() < st2.doubleCast) this.scene.time.delayedCall(250, () => this.scene.mercs.includes(merc) && this.scene.castSkill(merc, merc.def, st2, this.monstersInRange(merc.x, merc.y, st2.range)));
        });
        continue;
      }
      // 기본 공격 = 단일 대상 (2026-11-26) — 공성 조준기면 체력이 가장 많은 적
      const picked = st.item.strongest ? [[...live].sort((a, b) => b.hp - a.hp)[0]] : [live[0]];
      // 피해·투사체는 휘두름·발사 프레임에 나간다 (2026-11-20). 노린 대상 중 살아 있는 것만 — 모두 죽으면 위에서 공격 취소
      const timer = this.atHitFrame(merc, st, () => {
        if (merc.pendingHit?.timer === timer) merc.pendingHit = null;
        let hitAny = false;
        for (const m of picked) {
          if (!m.alive) continue;
          this.basicAttack(merc, st, m);
          hitAny = true;
        }
        if (!hitAny) return;
        merc.attacks += 1;
        merc.mana = Math.min(merc.maxMana, merc.mana + st.manaGain * deb.cdRate); // 마나 (시간 부식 디버프면 덜 찬다)
        if (merc.origin === 'north' && this.scene.syn.tiers.north) merc.rage = Math.min(RAGE_MAX, merc.rage + 1); // 북방 부족 분노
      });
      if (timer) merc.pendingHit = { timer, targets: picked };
    }
  }

  /** 스킬을 쓸 수 있는지 (castSkill 이 false 를 내는 조건과 같게 — 시전 동작을 헛되이 하지 않게) */
  canCast(def, inRange) {
    return !(def.area || def.buff) || inRange.some((m) => m.alive);
  }

  /**
   * 공격 동작을 재생하고, 타격·발사 프레임(manifest attack.hit)에 fn 을 부른다.
   * 공격 모션 길이는 공속에 맞춘다 — 공격 간격의 85% 동안 한 번 휘두른다 (배속은 anims.globalTimeScale, 2026-11-19).
   * 애니메이션이 없으면 살짝 튀어오르고 바로 fn. 기다리는 동안 판이 끝나거나 용병이 필드를 떠나면 취소.
   * 기다리면 타이머를 돌려준다 (바로 부르면 null) — 공격 취소용
   */
  atHitFrame(merc, st, fn) {
    if (!playOnce(merc.sprite, 'attack', 'idle', BALANCE.attackAnim.share * (1000 / st.rate))) {
      this.scene.tweens.add({ targets: merc.sprite, y: -PX * 2, duration: 60, yoyo: true });
      fn();
      return null;
    }
    const wait = hitDelay(merc.sprite, 'attack');
    if (wait <= 0) {
      fn();
      return null;
    }
    return this.scene.time.delayedCall(wait, () => {
      if (this.scene.over || !merc.sprite.active || !this.scene.mercs.includes(merc)) return;
      fn();
    });
  }

  hit(merc, st, target, mult, crit = false, carry = true) {
    const b = this.scene.bonus;
    // 보스·정예: 기본 피해 배율 + 거인 사냥꾼, 그리고 왕/정예 사냥꾼
    const giant = target.kind === 'normal' ? 1 : (BALANCE.bossDamageMult + b.bossDmg) * (1 + (target.isBoss ? b.bossOnly : b.eliteOnly));
    const slayer = target.kind !== 'normal' && merc.trait?.bossMult ? merc.trait.bossMult : 1; // 특성: 보스·정예 특화
    const elite = target.kind !== 'normal' ? 1 + (st.eliteDmg || 0) + (target.isBoss ? st.bossDmg || 0 : 0) : 1; // 사수 시너지·아이템: 정예·보스 피해
    const far = st.item?.farDmg ? 1 + st.item.farDmg * Math.min(1, Math.sqrt(d2(target, merc)) / st.range) : 1; // 명사수 조준경
    const dmg = st.damage * mult * giant * slayer * elite * far;
    const need = carry && target.kind === 'normal' ? target.rawToKill(this.scene.gameTime, merc) : Infinity;
    this.damageMonster(target, dmg, { source: merc, crit });
    if (dmg > need) this.carryDamage(merc, target, dmg - need);
  }

  /** 물량 관통: 일반 몬스터를 죽이고 남은 피해가 가까운 다음 일반 몬스터로 넘어간다 (피해 총량이 낭비되지 않게) */
  carryDamage(merc, from, left) {
    const H = BALANCE.horde;
    const r2 = H.carryRadius * H.carryRadius;
    let x = from.x;
    let y = from.y;
    for (let hop = 0; hop < H.carryHops && left > 0.01; hop++) {
      let best = null;
      let bd = r2;
      for (const o of this.scene.monsters) {
        if (!o.alive || o.kind !== 'normal') continue;
        const dd = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
        if (dd < bd) {
          bd = dd;
          best = o;
        }
      }
      if (!best) break;
      const need = best.rawToKill(this.scene.gameTime, merc);
      x = best.x;
      y = best.y;
      this.damageMonster(best, left, { source: merc });
      left -= need;
    }
  }

  /** 연출·사운드용 유닛 종류: 용병 클래스 또는 영웅 원형 */
  kindOf(merc) {
    return merc.kind;
  }

  basicAttack(merc, st, target) {
    this.scene.vfx.attack(merc, target, this.kindOf(merc));
    audio.shoot(this.kindOf(merc));
    const crit = Math.random() < st.crit;
    if (crit) audio.crit();
    const now = this.scene.gameTime;
    if (st.slow) target.applySlow(Math.min(0.85, st.slow * st.hex), st.slowDur, now);
    // 고유 특성 (data/roster.js): 지속 피해·약화·밀치기·확률 기절·처형 — 주술 효과는 주술사 시너지만큼 세진다
    const t = merc.trait || {};
    const ix = st.item || {};
    const exe = Math.max(t.execute || 0, ix.execute || 0); // 특성·현상금 표식: 처형
    if (exe && target.kind === 'normal' && target.hp / target.maxHp <= exe) {
      this.killMonster(target, merc);
      return;
    }
    if (t.dot) target.applyDot(st.damage * t.dot[0] * st.hex, t.dot[1], now, merc);
    if (t.vuln) target.applyVuln(t.vuln[0] * st.hex, t.vuln[1], now);
    const teamVuln = this.scene.syn.tiers.hexer?.teamVuln; // 주술사 8: 모든 아군 공격에 약화
    if (teamVuln) target.applyVuln(teamVuln, 2, now);
    if (t.push) target.push(t.push);
    if (t.stun && Math.random() < t.stun[0]) target.applyStun(t.stun[1], now);
    const pos = { x: target.x, y: target.y };
    // 기본 공격 = 관통 없는 단일 대상 (2026-11-26 사용자 결정) — 동시 공격·범위·연쇄는 피해 배율로 (스킬 피해엔 안 붙음)
    const bm = basicMul(st.targets, st.splash, st.chain);
    this.hit(merc, st, target, (crit ? st.critMult : 1) * bm, crit, false);
    // 암살자 8: 치명타 때 확률로 한 번 더
    if (crit && st.critExtra && Math.random() < st.critExtra && target.alive) this.hit(merc, st, target, st.critMult * bm, true, false);
    // 포격수 5·8: 맞은 적에 불길 · 한 번 더(50%)
    if (st.burn && target.alive) target.applyDot(st.damage * 0.3, st.burn, now, merc);
    if (st.doubleBlast) this.scene.time.delayedCall(180, () => !this.scene.over && target.alive && this.hit(merc, st, target, 0.5 * bm, false, false));
    // 아이템: 쌍날 단검(2번마다 한 번 더) · 산탄 장치(주변 30px) · 불꽃 화살통(3번마다 폭발)
    if (ix.extraEvery && (merc.attacks + 1) % ix.extraEvery === 0 && target.alive) this.hit(merc, st, target, 0.5 * bm, false, false);
    if (ix.scatter) for (const o of this.scene.monsters) if (o.alive && o !== target && d2(o, pos) <= ix.scatter ** 2) this.hit(merc, st, o, 0.5, false, false);
    if (ix.burstEvery && (merc.attacks + 1) % ix.burstEvery === 0) {
      for (const o of this.scene.monsters) if (o.alive && d2(o, pos) <= 40 * 40) this.hit(merc, st, o, 0.8, false, false);
      this.scene.circleFx(pos.x, pos.y, 40, 0xd9822b);
    }
    // 전사 5·8: N번째 공격마다 주변 베기 (반경 44, 60% 피해)
    if (st.cleaveEvery && (merc.attacks + 1) % st.cleaveEvery === 0) {
      for (const o of this.scene.monsters) if (o.alive && o !== target && d2(o, pos) <= 44 * 44) this.hit(merc, st, o, 0.6, false, false);
      this.scene.circleFx(pos.x, pos.y, 44, 0xc0563c);
    }
    // 사수: 관통 — 대상 뒤 가까운 몬스터 n마리에 60% 피해
    if (st.pierce) {
      const near = this.scene.monsters.filter((o) => o.alive && o !== target && d2(o, pos) <= 56 * 56).sort((a, b) => d2(a, pos) - d2(b, pos));
      for (const o of near.slice(0, st.pierce)) this.hit(merc, st, o, 0.6, false, false);
    }
  }

  chainFrom(start, n) {
    const out = [start];
    let cur = start;
    while (out.length < n) {
      let best = null;
      let bd = 140 * 140;
      for (const m of this.scene.monsters) {
        if (!m.alive || out.includes(m)) continue;
        const dd = d2(m, cur);
        if (dd < bd) {
          bd = dd;
          best = m;
        }
      }
      if (!best) break;
      out.push(best);
      cur = best;
    }
    return out;
  }

  damageMonster(m, amount, { source, crit = false, silent = false, dot = false } = {}) {
    if (!m.alive) return;
    amount = m.mitigate(amount, this.scene.gameTime, source, dot); // 약화·저항·방어력 (2026-11-24 특수 몬스터)
    m.hp -= amount;
    if (!silent) m.flashUntil = this.scene.gameTime + 0.06;
    if (crit) this.scene.floatText(m.x, m.y - 20, `${Math.round(amount)}!`, '#ffd84a');
    if (m.hp <= 0) this.killMonster(m, source, crit);
  }

  killMonster(m, source, crit = false) {
    if (!m.alive) return;
    if (m.isFinal && !m.revived) return this.reviveFinalBoss(m);
    m.alive = false;
    this.scene.totalKills += 1;
    // 물량: 일반 몬스터 골드는 소수 → 모았다가 정수가 될 때마다 지급
    const bounty = source?.trait?.bounty || 0; // 특성: 처치 골드 증가
    const guild = this.scene.syn.tiers.guild?.gold || 0; // 황금 길드: 처치 골드 +
    const ix = source?.items?.length ? source.ifx : {};
    this.scene.goldFrac += m.gold * (1 + this.scene.bonus.bounty + bounty + guild + (ix.gold || 0));
    // 아이템: 행운의 편자(치명타 처치 10% +1G) · 보물 폭탄(10% +3G)
    if ((crit && ix.critGold && Math.random() < ix.critGold) || (ix.treasure && Math.random() < ix.treasure)) this.scene.goldFrac += ix.treasure && !crit ? 3 : 1;
    if (source) source.waveKills = (source.waveKills || 0) + 1;
    // 주술사 5: 지속 피해가 걸린 적이 죽으면 가장 가까운 적에게 옮는다
    if (this.scene.syn.tiers.hexer?.spread && m.dots?.length) {
      const next = this.scene.monsters.find((o) => o.alive && o !== m && d2(o, m) <= 80 * 80);
      if (next) for (const d of m.dots) next.applyDot(d.dps, Math.max(1, d.until - this.scene.gameTime), this.scene.gameTime, d.source);
    }
    const gold = Math.floor(this.scene.goldFrac + 1e-9);
    this.scene.goldFrac -= gold;
    if (source && source.active) source.kills += 1;
    this.scene.gold += gold;
    this.scene.deathFx(m);
    this.scene.vfx.coinDrop(m.x, m.y);
    this.scene.dropItems(m);
    if (m.isBoss) {
      this.scene.earnFame((m.isFinal ? FAME.finalBoss : m.milestone ? FAME.milestoneBoss : FAME.boss) + this.scene.bonus.bossFame);
      audio.bossKill();
      this.scene.earnStones(m.isFinal ? STONES.final : m.milestone ? STONES.milestone : STONES.boss, m.x, m.y);
      if (m.isFinal) this.scene.celebrateCycle();
    } else audio.kill();
    if (m.kind !== 'normal') this.scene.floatText(m.x, m.y - 30, `+${gold}G`, '#f2c14e');
    m.destroy();
  }

  /** 최종 보스 첫 사망: 50% 체력으로 부활하고 디버프 능력이 하나 늘어난다 */
  reviveFinalBoss(m) {
    const added = m.revive();
    m.dots = [];
    this.scene.cameras.main.flash(400, 120, 40, 160);
    this.scene.cameras.main.shake(500, 0.01);
    this.scene.vfx.burst('curse', m.x, m.y, 40);
    this.scene.vfx.shockwave(m.x, m.y, 160, 0xb47cff);
    this.scene.showBanner(`${m.design.name} 부활!`, `체력 ${Math.round(BALANCE.final.reviveHp * 100)}% 회복 · 새 디버프: ${added.map((d) => d.name).join(', ')}`, '#ff4dd2');
    audio.bossAppear();
  }
}
