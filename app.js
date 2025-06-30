if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('✅ Service Worker terdaftar di:', reg.scope))
      .catch(err => console.error('❌ Gagal daftar Service Worker:', err));
  });
}
