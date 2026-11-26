
/** 게임 시간: 배속 · 정지 · 애니메이션 시계 */
export class TimeControl {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this._animSpeed = null;
  }

  /** 게임 속도를 바로 정한다 (단축키 1·2·3). 정지 중이면 정지를 푼다 */
  setSpeed(v) {
    if (this.scene.paused) this.togglePause();
    this.scene.speed = v;
    this.scene.tweens.timeScale = v;
    this.scene.hud.setPaused(false);
  }

  /** 배속 버튼: x1 → x2 → x3 → 정지 → (다시 누르면) x1 */
  cycleSpeed() {
    if (this.scene.paused) {
      this.scene.speed = 1;
      this.scene.tweens.timeScale = 1;
      this.togglePause();
    } else if (this.scene.speed >= 3) {
      this.togglePause();
    } else {
      this.scene.speed += 1;
      this.scene.tweens.timeScale = this.scene.speed;
      this.scene.hud.setPaused(false);
    }
  }

  /**
   * 일시정지(정지 버튼·ESC 메뉴·유물 선택·튜토리얼) 동안 캐릭터·몬스터·이펙트 애니메이션과 전투 타이머도 멈춘다 (2026-11-19).
   * 배속은 애니메이션·타이머에도 그대로 걸린다
   */
  syncFreeze(frozen) {
    const sp = frozen ? 0 : this.scene.speed;
    if (this._animSpeed === sp) return;
    this._animSpeed = sp;
    if (frozen) this.scene.anims.pauseAll();
    else {
      this.scene.anims.resumeAll();
      this.scene.anims.globalTimeScale = this.scene.speed;
    }
    this.scene.time.timeScale = this.scene.speed;
    this.scene.time.paused = frozen;
  }

  /** 애니메이션 시계는 게임 전체 공용(game.anims) — 판이 끝나거나 장면을 떠날 때 원래대로 */
  resetAnimClock() {
    this._animSpeed = null;
    this.scene.anims.resumeAll();
    this.scene.anims.globalTimeScale = 1;
    this.scene.time.paused = false;
    this.scene.time.timeScale = 1;
  }

  togglePause() {
    this.scene.paused = !this.scene.paused;
    this.scene.hud.setPaused(this.scene.paused);
    if (this.scene.paused) this.scene.tweens.pauseAll();
    else this.scene.tweens.resumeAll();
  }
}
