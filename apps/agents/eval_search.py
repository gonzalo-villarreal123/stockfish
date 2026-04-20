#!/usr/bin/env python3
"""
STO-15: Evaluación de relevancia de búsqueda — 20 queries de prueba.

Corre 20 queries representativas contra el motor de búsqueda vectorial de Stockfish
y reporta métricas de relevancia: cobertura, keyword hit rate y similitud semántica.

Uso:
    python eval_search.py
    python eval_search.py --output eval_results.json
    python eval_search.py --query Q01   # solo un query específico
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

from graph import (
    get_embedding,
    embedding_to_str,
    search_by_category,
    enrich_query,
    CATEGORY_CONTEXT,
    CATEGORY_LABELS,
)

# ── 20 Queries de prueba ──────────────────────────────────────────────────────
# Cobertura: todas las categorías (lampara, mueble, textil, cuadro, florero,
#            escultura, espejo, planta) + queries de estilo y material

TEST_QUERIES: List[Dict[str, Any]] = [
    # ── Iluminación ──────────────────────────────────────────
    {
        "id": "Q01",
        "description": "Lámpara de pie minimalista",
        "query": "lámpara de pie para living minimalista",
        "categories": ["lampara"],
        "expected_keywords": ["lámpara", "pie", "floor", "lamp", "velador"],
    },
    {
        "id": "Q02",
        "description": "Velador nórdico para mesa de noche",
        "query": "velador para mesa de noche estilo nórdico madera",
        "categories": ["lampara"],
        "expected_keywords": ["velador", "lámpara", "noche", "madera", "mesita"],
    },
    {
        "id": "Q03",
        "description": "Lámpara colgante industrial",
        "query": "lámpara colgante estilo industrial con metal y cable trenzado",
        "categories": ["lampara"],
        "expected_keywords": ["colgante", "industrial", "lámpara", "metal", "cable"],
    },
    # ── Muebles ──────────────────────────────────────────────
    {
        "id": "Q04",
        "description": "Sillón tapizado boucle crema",
        "query": "sillón tapizado en boucle color crema para living",
        "categories": ["mueble"],
        "expected_keywords": ["sillón", "sofá", "boucle", "crema", "living"],
    },
    {
        "id": "Q05",
        "description": "Mesa ratona mármol y madera",
        "query": "mesa ratona de mármol con patas de madera",
        "categories": ["mueble"],
        "expected_keywords": ["mesa", "mármol", "madera", "ratona", "centro"],
    },
    {
        "id": "Q06",
        "description": "Escritorio para home office",
        "query": "escritorio moderno blanco para home office",
        "categories": ["mueble"],
        "expected_keywords": ["escritorio", "desk", "trabajo", "oficina", "estudio"],
    },
    # ── Textiles ─────────────────────────────────────────────
    {
        "id": "Q07",
        "description": "Alfombra beige living amplio",
        "query": "alfombra beige con textura para living amplio",
        "categories": ["textil"],
        "expected_keywords": ["alfombra", "beige", "yute", "natural", "living"],
    },
    {
        "id": "Q08",
        "description": "Almohadones lino tonos tierra",
        "query": "almohadones de lino natural en tonos tierra",
        "categories": ["textil"],
        "expected_keywords": ["almohadón", "almohada", "lino", "textil", "cushion"],
    },
    {
        "id": "Q09",
        "description": "Terciopelo verde botella",
        "query": "terciopelo verde botella para living opulento velvet",
        "categories": ["textil"],
        "expected_keywords": ["terciopelo", "velvet", "verde", "botella", "textil"],
    },
    # ── Arte / Cuadros ────────────────────────────────────────
    {
        "id": "Q10",
        "description": "Cuadros abstractos tonos neutros",
        "query": "cuadros abstractos en tonos neutros para living",
        "categories": ["cuadro"],
        "expected_keywords": ["cuadro", "arte", "abstracto", "pintura", "lámina"],
    },
    {
        "id": "Q11",
        "description": "Láminas fotográficas blanco y negro",
        "query": "láminas fotográficas en blanco y negro estilo minimalista",
        "categories": ["cuadro"],
        "expected_keywords": ["fotografía", "lámina", "blanco", "negro", "foto", "poster"],
    },
    # ── Floreros / Decoración ─────────────────────────────────
    {
        "id": "Q12",
        "description": "Florero cerámica artesanal",
        "query": "florero de cerámica artesanal en tonos tierra",
        "categories": ["florero"],
        "expected_keywords": ["florero", "jarrón", "cerámica", "barro", "arcilla"],
    },
    {
        "id": "Q13",
        "description": "Florero vidrio transparente",
        "query": "florero de vidrio transparente alto para flores",
        "categories": ["florero"],
        "expected_keywords": ["florero", "vidrio", "jarrón", "cristal", "transparente"],
    },
    # ── Esculturas ────────────────────────────────────────────
    {
        "id": "Q14",
        "description": "Escultura forma de hongo",
        "query": "escultura decorativa con forma de hongo para estante",
        "categories": ["escultura"],
        "expected_keywords": ["escultura", "figura", "hongo", "mushroom", "fungi"],
    },
    {
        "id": "Q15",
        "description": "Figura decorativa abstracta resina",
        "query": "figura decorativa abstracta minimalista de resina",
        "categories": ["escultura"],
        "expected_keywords": ["figura", "escultura", "decorativo", "resina", "abstracto"],
    },
    # ── Espejos ───────────────────────────────────────────────
    {
        "id": "Q16",
        "description": "Espejo redondo marco madera",
        "query": "espejo redondo grande con marco de madera natural",
        "categories": ["espejo"],
        "expected_keywords": ["espejo", "redondo", "marco", "madera", "circular"],
    },
    {
        "id": "Q17",
        "description": "Espejo arco cuerpo entero bohemio",
        "query": "espejo arco de cuerpo entero estilo bohemio",
        "categories": ["espejo"],
        "expected_keywords": ["espejo", "arco", "cuerpo", "entero", "bohemio"],
    },
    # ── Queries de estilo (multi-categoría) ──────────────────
    {
        "id": "Q18",
        "description": "Living nórdico completo",
        "query": "decoración nórdica escandinava tonos beige madera y textiles suaves",
        "categories": ["mueble", "textil", "lampara"],
        "expected_keywords": ["nórdico", "escandinavo", "beige", "madera", "natural"],
    },
    {
        "id": "Q19",
        "description": "Estilo industrial metal y madera",
        "query": "decoración industrial con metal negro y madera oscura",
        "categories": ["lampara", "mueble"],
        "expected_keywords": ["industrial", "metal", "negro", "hierro", "madera"],
    },
    # ── Departamento pequeño ──────────────────────────────────
    {
        "id": "Q20",
        "description": "Departamento pequeño contemporáneo",
        "query": "decoración para departamento pequeño estilo contemporáneo funcional",
        "categories": ["mueble", "textil"],
        "expected_keywords": ["moderno", "funcional", "contemporáneo", "compacto", "minimalista"],
    },
]


# ── Evaluación ────────────────────────────────────────────────────────────────

def evaluate_query(test_case: Dict[str, Any]) -> Dict[str, Any]:
    """Ejecuta un query de prueba y evalúa sus resultados."""
    results_by_category: Dict[str, Any] = {}

    enriched = enrich_query(test_case["query"])

    for category in test_case["categories"]:
        try:
            # Replicar lógica de combo_search_node: enriquecer con contexto de categoría
            category_ctx = CATEGORY_CONTEXT.get(category, "")
            full_query = f"{enriched} {category_ctx}".strip() if category_ctx else enriched

            t0 = time.time()
            embedding = get_embedding(full_query)
            embedding_str = embedding_to_str(embedding)
            products = search_by_category(embedding_str, category, limit=3)
            latency_ms = int((time.time() - t0) * 1000)

            top1 = products[0] if products else None

            # Keyword hit: ¿el nombre/descripción del top-1 contiene alguna palabra esperada?
            keyword_hit = False
            matched_keywords: List[str] = []
            if top1:
                searchable = (
                    (top1.get("name") or "") + " " +
                    (top1.get("description") or "")
                ).lower()
                for kw in test_case.get("expected_keywords", []):
                    if kw.lower() in searchable:
                        keyword_hit = True
                        matched_keywords.append(kw)

            # Recoger scores de similitud (devueltos por el RPC de pgvector)
            similarities = [
                p["similarity"] for p in products if p.get("similarity") is not None
            ]

            results_by_category[category] = {
                "found": len(products) > 0,
                "count": len(products),
                "latency_ms": latency_ms,
                "keyword_hit": keyword_hit,
                "matched_keywords": matched_keywords,
                "top3": [
                    {
                        "name": p.get("name"),
                        "price": p.get("price"),
                        "similarity": p.get("similarity"),
                        "merchant": p.get("merchant_slug"),
                        "category": p.get("category"),
                    }
                    for p in products
                ],
                "avg_similarity": (
                    round(sum(similarities) / len(similarities), 4)
                    if similarities else None
                ),
            }

        except Exception as e:
            results_by_category[category] = {
                "found": False,
                "error": str(e),
                "keyword_hit": False,
            }

    # ── Métricas agregadas por query ──────────────────────────
    all_cat = list(results_by_category.values())
    categories_found = sum(1 for r in all_cat if r.get("found"))
    categories_total = len(test_case["categories"])
    keyword_hits = sum(1 for r in all_cat if r.get("keyword_hit"))

    all_sims = [
        r["avg_similarity"]
        for r in all_cat
        if r.get("avg_similarity") is not None
    ]

    return {
        "id": test_case["id"],
        "description": test_case["description"],
        "query": test_case["query"],
        "categories_total": categories_total,
        "categories_found": categories_found,
        "coverage": round(categories_found / categories_total, 2) if categories_total else 0,
        "keyword_hit_rate": round(keyword_hits / categories_total, 2) if categories_total else 0,
        "avg_similarity": (
            round(sum(all_sims) / len(all_sims), 4) if all_sims else None
        ),
        "results_by_category": results_by_category,
    }


def run_eval(query_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Corre la evaluación completa (o un subconjunto si se pasan IDs)."""
    queries = TEST_QUERIES
    if query_ids:
        queries = [q for q in TEST_QUERIES if q["id"] in query_ids]
        if not queries:
            print(f"[eval] No se encontraron queries con IDs: {query_ids}")
            sys.exit(1)

    print(f"\n{'='*70}")
    print(f"  Stockfish — Evaluación de relevancia de búsqueda (STO-15)")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')} | {len(queries)} queries")
    print(f"{'='*70}\n")

    all_results = []
    for i, test_case in enumerate(queries, 1):
        print(f"[{i:02d}/{len(queries)}] {test_case['id']} — {test_case['description']}...", end="", flush=True)
        result = evaluate_query(test_case)
        all_results.append(result)

        sim_str = f"{result['avg_similarity']:.3f}" if result["avg_similarity"] else "  n/a"
        cov = "OK" if result["coverage"] == 1.0 else "NO"
        kw  = "OK" if result["keyword_hit_rate"] > 0 else "NO"
        print(f"  sim={sim_str}  cov={cov}  kw={kw}")

    return all_results


def print_report(results: List[Dict[str, Any]]) -> None:
    """Imprime tabla resumen y métricas globales."""

    # ── Tabla por query ───────────────────────────────────────
    print(f"\n{'─'*70}")
    print(f"{'ID':<5} {'Descripción':<32} {'Cat':<5} {'Sim':>6}  {'Cob':>4}  {'Kw':>4}")
    print(f"{'─'*70}")

    for r in results:
        sim = f"{r['avg_similarity']:.3f}" if r["avg_similarity"] else "  n/a"
        cov = f"{r['coverage']:.0%}"
        kw  = f"{r['keyword_hit_rate']:.0%}"
        print(f"{r['id']:<5} {r['description'][:32]:<32} "
              f"{r['categories_total']:<5} {sim:>6}  {cov:>4}  {kw:>4}")

    # ── Métricas globales ─────────────────────────────────────
    total = len(results)
    perfect_coverage = sum(1 for r in results if r["coverage"] == 1.0)
    any_keyword_hit  = sum(1 for r in results if r["keyword_hit_rate"] > 0)

    sims = [r["avg_similarity"] for r in results if r["avg_similarity"] is not None]
    global_avg_sim = sum(sims) / len(sims) if sims else None

    print(f"\n{'='*70}")
    print(f"  Resumen global ({total} queries)")
    print(f"{'─'*70}")
    print(f"  Cobertura perfecta (todos los productos encontrados): "
          f"{perfect_coverage}/{total} ({perfect_coverage/total:.0%})")
    print(f"  Queries con keyword hit en top-1:                     "
          f"{any_keyword_hit}/{total} ({any_keyword_hit/total:.0%})")
    if global_avg_sim is not None:
        print(f"  Similitud semántica promedio (top-3):                 "
              f"{global_avg_sim:.4f}")
    print(f"{'='*70}\n")

    # ── Queries que fallaron ──────────────────────────────────
    failed = [r for r in results if r["coverage"] < 1.0]
    if failed:
        print("  Queries sin resultados completos:")
        for r in failed:
            missing = [
                cat for cat, res in r["results_by_category"].items()
                if not res.get("found")
            ]
            err_cats = [
                f"{cat}: {res.get('error', 'sin resultados')}"
                for cat, res in r["results_by_category"].items()
                if not res.get("found")
            ]
            print(f"    {r['id']} {r['description']} — falló en: {', '.join(missing)}")
            for e in err_cats:
                print(f"       ** {e}")
        print()

    # ── Queries sin keyword hit ───────────────────────────────
    no_kw = [r for r in results if r["keyword_hit_rate"] == 0]
    if no_kw:
        print("  Queries sin keyword hit en top-1:")
        for r in no_kw:
            # Mostrar qué se encontró
            cats_info = []
            for cat, res in r["results_by_category"].items():
                top = res.get("top3", [{}])[0] if res.get("top3") else {}
                name = top.get("name", "—")[:45] if top else "—"
                cats_info.append(f"{cat}→'{name}'")
            print(f"    {r['id']} {r['description']}")
            print(f"       esperaba: {r['results_by_category'] and list(r['results_by_category'].keys())}")
            for info in cats_info:
                print(f"       got: {info}")
        print()


def main():
    parser = argparse.ArgumentParser(description="Evaluación de relevancia STO-15")
    parser.add_argument("--output", "-o", help="Guardar resultados en JSON")
    parser.add_argument("--query", "-q", nargs="+", help="Correr solo estos IDs (ej: Q01 Q05)")
    args = parser.parse_args()

    results = run_eval(query_ids=args.query)
    print_report(results)

    if args.output:
        out = {
            "run_at": datetime.now().isoformat(),
            "total_queries": len(results),
            "results": results,
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"  Resultados guardados en: {args.output}\n")


if __name__ == "__main__":
    main()
