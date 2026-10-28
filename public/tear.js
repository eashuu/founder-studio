// Paper-rip page transition: a fresh jagged tear line each time.
// Skipped for back/forward so history navigation feels instant.
(function () {
  function line(y, tilt) {
    var pts = [], n = 28, j = 0;
    for (var i = 0; i <= n; i++) {
      j = Math.max(-2.2, Math.min(2.2, j + (Math.random() - 0.5) * 2.4));
      var x = (i / n) * 100;
      pts.push(x.toFixed(2) + '% ' + (y + tilt * (x / 100) + j).toFixed(2) + '%');
    }
    return 'polygon(' + pts.join(', ') + ', 100% 100%, 0% 100%)';
  }
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var nav = window.navigation && navigation.activation;
    if (nav && (nav.navigationType === 'traverse' || nav.navigationType === 'reload')) { e.viewTransition.skipTransition(); return; }
    var tilt = (Math.random() - 0.5) * 22;
    var style = document.createElement('style');
    style.textContent = '@keyframes tear-away{from{clip-path:' + line(-14 - Math.abs(tilt), tilt) + '}to{clip-path:' + line(112 + Math.abs(tilt), tilt) + '}}';
    document.head.appendChild(style);
    e.viewTransition.finished.then(function () { style.remove(); });
  });
})();
