"""
Unit tests for scraper.detect_category().

Run with:  python -m pytest test_scraper.py -v
       or:  python test_scraper.py
"""
from scraper import detect_category


# ── escultura: should match ────────────────────────────────
def test_escultura_explicit():
    assert detect_category("Escultura de bronce") == "escultura"

def test_escultura_figura_decorativa():
    assert detect_category("Figura decorativa de cerámica") == "escultura"

def test_escultura_estatua():
    assert detect_category("Estatua griega de mármol") == "escultura"


# ── escultura: false-positive regressions ──────────────────
def test_no_escultura_for_pieza_generica():
    """'pieza' alone should NOT trigger escultura (was root cause of garbage data)."""
    assert detect_category("Mesa ratona", "Cada pieza está hecha a mano con madera maciza") != "escultura"

def test_no_escultura_for_pieza_unica():
    assert detect_category("Silla Thonet", "Pieza única de colección") != "escultura"

def test_no_escultura_for_figura_sola():
    """Bare 'figura' without 'decorativa' should not trigger escultura."""
    result = detect_category("Lámpara de techo", "La figura del precio incluye IVA")
    assert result != "escultura"


# ── espejo: should match ───────────────────────────────────
def test_espejo_standalone():
    assert detect_category("Espejo redondo 60cm") == "espejo"

def test_espejo_mirror():
    assert detect_category("Wall mirror vintage") == "espejo"


# ── espejo: false-positive regressions ────────────────────
def test_no_espejo_for_mueble_con_espejo():
    """A dresser described with a mirror should be mueble, not espejo."""
    result = detect_category("Cómoda 6 cajones con espejo", "Mueble de dormitorio en roble")
    assert result == "mueble"

def test_no_espejo_for_mesa_con_espejo():
    result = detect_category("Mesa tocador con espejo")
    assert result == "mueble"


# ── other categories: smoke tests ─────────────────────────
def test_cuadro():
    assert detect_category("Cuadro abstracto 80x60") == "cuadro"

def test_lampara():
    assert detect_category("Lámpara de pie nórdica") == "lampara"

def test_florero():
    assert detect_category("Florero de vidrio soplado") == "florero"

def test_textil():
    assert detect_category("Almohadón bordado") == "textil"

def test_planta():
    assert detect_category("Maceta colgante de terracota") == "planta"

def test_mueble():
    assert detect_category("Estante flotante de madera") == "mueble"

def test_otro():
    assert detect_category("Producto genérico") == "otro"


if __name__ == "__main__":
    import sys
    failures = []
    tests = {k: v for k, v in globals().items() if k.startswith("test_")}
    for name, fn in tests.items():
        try:
            fn()
            print(f"  PASS  {name}")
        except AssertionError as e:
            print(f"  FAIL  {name}: {e}")
            failures.append(name)
    print(f"\n{len(tests) - len(failures)}/{len(tests)} passed")
    sys.exit(1 if failures else 0)
