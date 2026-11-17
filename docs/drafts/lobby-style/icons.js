// 평면 아이콘 (currentColor)
const IC = {
  crown: '<path d="M3 18h18l1.5-10-5.5 4L12 5l-5 7-5.5-4z"/><rect x="3" y="19" width="18" height="2.5" rx="1"/>',
  ticket: '<path d="M3 7h18v3.5a1.8 1.8 0 000 3.6V17.5H3V14a1.8 1.8 0 000-3.6z"/><path d="M14 8.5v7" stroke="#fff" stroke-width="1.4" stroke-dasharray="1.6 1.6" fill="none"/>',
  gem: '<path d="M6 4h12l4 6-10 11L2 10z"/><path d="M2 10h20M9 4l-2 6 5 11 5-11-2-6" stroke="rgba(255,255,255,.55)" stroke-width="1.2" fill="none"/>',
  sword: '<path d="M19.5 2.5L21.5 4.5 11 15l-2-2zM7.5 13l3.5 3.5-1.6 1.6-1-1-3 3a1.4 1.4 0 01-2-2l3-3-1-1z"/>',
  node: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M12 8v4M12 12l-6 4M12 12l6 4" stroke="currentColor" stroke-width="2" fill="none"/>',
  people: '<circle cx="8" cy="8" r="3.5"/><path d="M1.5 20c0-4 3-6.5 6.5-6.5s6.5 2.500 6.500 6.500z"/><circle cx="17" cy="9" r="2.800"/><path d="M15.500 13.800c3.500-.800 7 1.500 7 6.200h-6.300c0-2.300-.3-4.300-.7-6.200z"/>',
  anvil: '<path d="M4 6h13a4 4 0 004 4v1.500h-4c-1.500 0-2.500 1-3 2.500l1.500 4H18v2H6v-2h2.500L10 14c-.500-1.500-1.500-2.500-3-2.500C5 11.500 3 9.500 2 8h2z"/>',
  gear: '<path d="M12 8.500a3.500 3.500 0 100 7 3.500 3.500 0 000-7zm9 5l-2.200.700-.6 1.500 1.100 2-1.800 1.800-2-1.100-1.500.6-.700 2.200h-2.600l-.7-2.200-1.500-.6-2 1.100-1.800-1.800 1.100-2-.6-1.500L3 13.500v-2.600l2.200-.7.6-1.500-1.100-2 1.800-1.800 2 1.100 1.500-.6L10.700 3h2.600l.7 2.200 1.500.6 2-1.100 1.800 1.800-1.100 2 .6 1.500 2.200.7z" fill-rule="evenodd"/>',
  book: '<path d="M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-5a2 2 0 00-2 2v14a2 2 0 012-2h5z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pause: '<rect x="6" y="4" width="4.500" height="16" rx="1"/><rect x="13.500" y="4" width="4.500" height="16" rx="1"/>',
  menu: '<rect x="3" y="5" width="18" height="3" rx="1.500"/><rect x="3" y="10.500" width="18" height="3" rx="1.500"/><rect x="3" y="16" width="18" height="3" rx="1.500"/>',
  clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5.500l3.500 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  skull: '<path d="M12 3a8 8 0 00-5 14.200V20h10v-2.800A8 8 0 0012 3zm-3 9a1.800 1.800 0 110-3.600A1.800 1.800 0 019 12zm6 0a1.800 1.800 0 110-3.600 1.800 1.800 0 010 3.600z" fill-rule="evenodd"/>',
  shield: '<path d="M12 2l8 3v6c0 5.500-3.500 9-8 11-4.500-2-8-5.500-8-11V5z"/>',
  mail: '<path d="M2 5h20v14H2z"/><path d="M2 6l10 7 10-7" stroke="#fff" stroke-width="1.600" fill="none"/>',
  plus: '<path d="M10.500 4h3v6.500H20v3h-6.500V20h-3v-6.500H4v-3h6.500z"/>'
};
function icons() { document.querySelectorAll('i.ic').forEach((e) => { e.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">${IC[e.dataset.i] || ''}</svg>`; }); }
