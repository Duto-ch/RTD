// 단순한 오리지널 아이콘 (SVG)
const I = {
  leaf: '<svg class="leaf" viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" fill="#7a9a5c" stroke="#4f6b3e" stroke-width="1.6"/><path d="M5 19 14 10" stroke="#4f6b3e" stroke-width="1.6" fill="none"/></svg>',
  coin: '<svg width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#e8b84a" stroke="#9a6a1c" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#b9852a" stroke-width="1.6"/></svg>',
  skull: '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 3c-5 0-8 3-8 7 0 3 2 4 2 6v3h12v-3c0-2 2-3 2-6 0-4-3-7-8-7z" fill="#7d6b55"/><circle cx="9" cy="11" r="2" fill="#fbf7ec"/><circle cx="15" cy="11" r="2" fill="#fbf7ec"/></svg>',
  clock: '<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#8c7b60" stroke-width="2"/><path d="M12 7v5l3 2" stroke="#8c7b60" stroke-width="2" fill="none"/></svg>',
  sword: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M14 4h6v6L9 21l-3-3z" fill="#e9e2cf" stroke="#6b5a40" stroke-width="1.6"/><path d="M5 15l4 4M3 21l3-3" stroke="#6b5a40" stroke-width="2"/></svg>',
  tower: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M6 21V8h12v13zM6 8V4h3v2h2V4h2v2h2V4h3v4" fill="#d9cfb6" stroke="#6b5a40" stroke-width="1.6"/></svg>',
  people: '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4" fill="#d9cfb6" stroke="#6b5a40" stroke-width="1.6"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6z" fill="#d9cfb6" stroke="#6b5a40" stroke-width="1.6"/><circle cx="17" cy="9" r="2.6" fill="#d9cfb6" stroke="#6b5a40" stroke-width="1.4"/></svg>',
  gem: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M6 4h12l4 6-10 11L2 10z" fill="#d9cfb6" stroke="#6b5a40" stroke-width="1.6"/></svg>',
  book: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 4h7c1 0 1 1 1 2v14c0-1-1-2-2-2H4zM20 4h-7c-1 0-1 1-1 2v14c0-1 1-2 2-2h6z" fill="#d9cfb6" stroke="#6b5a40" stroke-width="1.5"/></svg>',
  gear: '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="none" stroke="#6b5a40" stroke-width="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#6b5a40" stroke-width="2"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 4l8 8-8 8zM13 4l8 8-8 8z" fill="currentColor"/></svg>',
  pause: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="3"/></svg>',
  plus: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>',
  sprout: '<svg width="64" height="64" viewBox="0 0 24 24"><path d="M12 22V12" stroke="#56743f" stroke-width="2"/><path d="M12 13C12 8 8 6 4 6c0 5 3 7 8 7zM12 11c0-4 3-7 8-7 0 5-3 8-8 7z" fill="#8aab68" stroke="#56743f" stroke-width="1.4"/></svg>'
};
document.querySelectorAll('[data-i]').forEach((e) => (e.outerHTML = I[e.dataset.i]));
