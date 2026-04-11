(function () {
  var merchant = document.currentScript
    ? document.currentScript.getAttribute("data-merchant") || "altorancho"
    : "altorancho";

  var BASE_URL = "https://focobusiness.com";
  var WIDGET_URL = BASE_URL + "/widget/" + merchant;

  // ── Estilos ───────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#sf-bubble{position:fixed;bottom:24px;right:24px;z-index:99998;display:flex;flex-direction:column;align-items:flex-end;gap:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    "#sf-btn{width:60px;height:60px;border-radius:50%;background:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s}",
    "#sf-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,0.32)}",
    "#sf-btn svg{width:28px;height:28px}",
    "#sf-label{background:#fff;color:#000;font-size:13px;font-weight:600;padding:8px 14px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,0.15);white-space:nowrap;animation:sf-fadein 0.3s ease}",
    "#sf-panel{position:fixed;bottom:100px;right:24px;z-index:99999;width:400px;height:620px;border-radius:20px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.3);display:none;animation:sf-slidein 0.25s ease}",
    "#sf-panel iframe{width:100%;height:100%;border:none}",
    "@media(max-width:480px){#sf-panel{width:calc(100vw - 32px);height:calc(100vh - 120px);right:16px;bottom:88px;border-radius:16px}}",
    "@keyframes sf-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
    "@keyframes sf-slidein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}",
  ].join("");
  document.head.appendChild(style);

  // ── DOM ───────────────────────────────────────────────────
  var bubble = document.createElement("div");
  bubble.id = "sf-bubble";

  var label = document.createElement("div");
  label.id = "sf-label";
  label.textContent = "Encontrá tu estilo ✨";

  var btn = document.createElement("button");
  btn.id = "sf-btn";
  btn.title = "Abrir asistente de decoración";
  btn.innerHTML = '<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">'
    // Pez — cuerpo
    + '<ellipse cx="27" cy="31" rx="13" ry="8.5" fill="#000"/>'
    // Pez — cola
    + '<path d="M40 31 L50 24 L50 38 Z" fill="#000"/>'
    // Pez — ojo
    + '<circle cx="21" cy="29" r="2" fill="#fff"/>'
    // Estrella IA — 4 puntas, esquina superior derecha
    + '<path d="M47 8 L48.5 12.5 L53 14 L48.5 15.5 L47 20 L45.5 15.5 L41 14 L45.5 12.5 Z" fill="#000"/>'
    // Texto "AI" pequeño bajo el pez
    + '<text x="27" y="48" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="8.5" font-weight="800" fill="#000" text-anchor="middle" letter-spacing="2">AI</text>'
    + '</svg>';

  var panel = document.createElement("div");
  panel.id = "sf-panel";
  panel.innerHTML = '<iframe src="' + WIDGET_URL + '" allow="camera"></iframe>';

  bubble.appendChild(label);
  bubble.appendChild(btn);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  // ── Escuchar eventos del widget ───────────────────────────
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "sf-add-to-cart") return;
    var product = e.data.product;
    if (!product || !product.url) return;
    // Abrir el producto en una nueva pestaña para que el usuario complete la compra
    window.open(product.url, "_blank");
  });

  // ── Lógica ────────────────────────────────────────────────
  var open = false;

  // Ocultar label después de 4 segundos
  setTimeout(function () {
    label.style.display = "none";
  }, 4000);

  btn.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "block" : "none";
    btn.innerHTML = open
      ? '<svg viewBox="0 0 60 60" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"><line x1="42" y1="18" x2="18" y2="42"/><line x1="18" y1="18" x2="42" y2="42"/></svg>'
      : '<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="27" cy="31" rx="13" ry="8.5" fill="#000"/><path d="M40 31 L50 24 L50 38 Z" fill="#000"/><circle cx="21" cy="29" r="2" fill="#fff"/><path d="M47 8 L48.5 12.5 L53 14 L48.5 15.5 L47 20 L45.5 15.5 L41 14 L45.5 12.5 Z" fill="#000"/><text x="27" y="48" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="8.5" font-weight="800" fill="#000" text-anchor="middle" letter-spacing="2">AI</text></svg>';
  });
})();
