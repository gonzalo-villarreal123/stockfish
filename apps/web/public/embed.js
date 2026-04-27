(function () {
  var merchant = document.currentScript
    ? document.currentScript.getAttribute("data-merchant") || "altorancho"
    : "altorancho";

  var BASE_URL   = "https://focobusiness.com";
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
    "#sf-toast{position:fixed;bottom:96px;right:24px;z-index:100000;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:600;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.22);pointer-events:none;animation:sf-fadein 0.25s ease;display:none}",
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

  var ICON_FISH = '<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<ellipse cx="27" cy="31" rx="13" ry="8.5" fill="#000"/>'
    + '<path d="M40 31 L50 24 L50 38 Z" fill="#000"/>'
    + '<circle cx="21" cy="29" r="2" fill="#fff"/>'
    + '<path d="M47 8 L48.5 12.5 L53 14 L48.5 15.5 L47 20 L45.5 15.5 L41 14 L45.5 12.5 Z" fill="#000"/>'
    + '<text x="27" y="48" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="8.5" font-weight="800" fill="#000" text-anchor="middle" letter-spacing="2">AI</text>'
    + '</svg>';

  var ICON_CLOSE = '<svg viewBox="0 0 60 60" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"><line x1="42" y1="18" x2="18" y2="42"/><line x1="18" y1="18" x2="42" y2="42"/></svg>';

  btn.innerHTML = ICON_FISH;

  var panel = document.createElement("div");
  panel.id = "sf-panel";
  panel.innerHTML = '<iframe src="' + WIDGET_URL + '" allow="camera;clipboard-write"></iframe>';

  var toast = document.createElement("div");
  toast.id = "sf-toast";

  bubble.appendChild(label);
  bubble.appendChild(btn);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);
  document.body.appendChild(toast);

  // ── Toast helper ──────────────────────────────────────────
  var toastTimer = null;
  function showToast(text, success) {
    toast.textContent = text;
    toast.style.background = success ? "#22c55e" : "#ef4444";
    toast.style.display = "block";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.style.display = "none";
    }, 3000);
  }

  // ── Agregar al carrito (Tienda Nube) ─────────────────────
  // Fetchea la página del producto para obtener el variant_id de LS.variants,
  // luego hace POST a /carrito/agregar. Fallback: abre la URL del producto.
  function addToCartTN(source, product) {
    var productUrl = product.url;
    if (!productUrl) { fallbackOpen(product); return; }

    // Construir URL same-origin (resuelve discrepancias de dominio)
    try {
      var a = document.createElement("a");
      a.href = productUrl;
      var samePath = window.location.origin + a.pathname;

      fetch(samePath, { credentials: "same-origin" })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          // Extraer LS.variants del JS de TN
          var variantId = null;

          // 1. LS.variants array (Tienda Nube estándar)
          var m = html.match(/LS\.variants\s*=\s*(\[[\s\S]*?\]);/);
          if (m) {
            try {
              var variants = JSON.parse(m[1]);
              // Elegir la primera variante disponible
              var available = variants.filter(function (v) { return v.available !== false; });
              if (available.length > 0) variantId = available[0].id;
            } catch (e) {}
          }

          // 2. Fallback: input hidden name="add" en el form del carrito
          if (!variantId) {
            var m2 = html.match(/name=["']add["'][^>]*value=["'](\d+)["']/);
            if (!m2) m2 = html.match(/value=["'](\d+)["'][^>]*name=["']add["']/);
            if (m2) variantId = m2[1];
          }

          // 3. Fallback: data-variant-id attribute
          if (!variantId) {
            var m3 = html.match(/data-variant-id=["'](\d+)["']/);
            if (m3) variantId = m3[1];
          }

          if (!variantId) throw new Error("variant not found");

          // POST al carrito de TN
          return fetch("/carrito/agregar", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "add=" + variantId + "&quantity=1",
            credentials: "same-origin",
          });
        })
        .then(function (r) {
          // TN redirige a /carrito al agregar — considerar ok
          if (r.ok || r.redirected || r.status === 302) {
            showToast("¡Agregado al carrito! 🛒", true);
            // Notificar al widget
            if (source) source.postMessage({ type: "sf-cart-added" }, "*");
            // Actualizar badge del carrito si TN lo expone
            if (window.LS && typeof window.LS.updateCartCount === "function") {
              window.LS.updateCartCount();
            }
            // Trigger cart refresh event que usan algunos temas TN
            document.dispatchEvent(new CustomEvent("cart:add"));
          } else {
            throw new Error("cart POST failed: " + r.status);
          }
        })
        .catch(function (err) {
          console.warn("[Stockfish] cart add failed:", err.message, "— fallback a nueva pestaña");
          fallbackOpen(product);
        });
    } catch (e) {
      fallbackOpen(product);
    }
  }

  function fallbackOpen(product) {
    window.open(product.url, "_blank");
  }

  // ── Escuchar mensajes del widget ──────────────────────────
  window.addEventListener("message", function (e) {
    if (!e.data) return;

    if (e.data.type === "sf-add-to-cart") {
      addToCartTN(e.source, e.data.product);
    }
  });

  // ── Lógica del bubble ─────────────────────────────────────
  var open = false;

  // Ocultar label después de 4 segundos
  setTimeout(function () { label.style.display = "none"; }, 4000);

  btn.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "block" : "none";
    btn.innerHTML = open ? ICON_CLOSE : ICON_FISH;
  });
})();
