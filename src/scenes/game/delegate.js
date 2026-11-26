/**
 * 시스템 메서드·getter 를 장면(GameScene)에서도 그대로 부를 수 있게 이어 준다.
 * Hud·Mercenary·테스트·밸런스 봇이 `g.buy(0)`·`g.mercs` 처럼 장면에 바로 묻기 때문.
 * 메서드는 덮어쓸 수 있게(writable) — 테스트가 `g.toast = …` 로 바꿔 끼운다.
 */
export function delegate(Target, field, System, names) {
  for (const name of names) {
    const d = Object.getOwnPropertyDescriptor(System.prototype, name);
    if (!d) throw new Error(`${System.name}.${name} 없음`);
    if (name in Target.prototype) throw new Error(`${Target.name}.${name} 이미 있음`);
    Object.defineProperty(
      Target.prototype,
      name,
      d.get
        ? { get() { return this[field][name]; }, configurable: true }
        : { value(...args) { return this[field][name](...args); }, writable: true, configurable: true }
    );
  }
}
