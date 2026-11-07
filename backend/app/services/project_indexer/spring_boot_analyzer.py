"""
CodeMate AI — Phase 7 Spring Boot Specialized Intelligence Engine
Identifies Spring components (@RestController, @Service, @Repository, @Entity),
maps REST endpoints, checks JPA relationships, and detects architectural anti-patterns.
"""

import json
import re
from typing import Dict, List, Optional, Set, Tuple


class SpringBootAnalyzer:
    """Analyzes extracted symbols and dependency relationships for Spring Boot semantics."""

    @classmethod
    def analyze_components(cls, symbols: List[Dict], dependencies: List[Dict]) -> Dict:
        """
        Classifies project symbols into Spring Boot architectural layers:
        - Controllers & HTTP endpoints
        - Services & Transaction boundaries
        - Repositories
        - Entities & JPA associations
        - DTOs
        - Architectural anti-patterns & recommendations
        """
        controllers: List[Dict] = []
        services: List[Dict] = []
        repositories: List[Dict] = []
        entities: List[Dict] = []
        dtos: List[Dict] = []
        endpoints: List[Dict] = []
        potential_issues: List[Dict] = []

        # Map symbol_name -> symbol
        sym_map = {s["symbol_name"]: s for s in symbols}

        for sym in symbols:
            name = sym["symbol_name"]
            kind = sym["symbol_type"]
            ann_raw = sym.get("annotations_json") or "[]"
            try:
                annotations = json.loads(ann_raw)
            except Exception:
                annotations = []
            ann_lower = [a.lower() for a in annotations]

            # 1. Main Application
            if any("@springbootapplication" in a for a in ann_lower):
                sym["spring_role"] = "APPLICATION_ENTRY"

            # 2. Controllers
            elif any("@restcontroller" in a or "@controller" in a for a in ann_lower):
                controllers.append({
                    "name": name,
                    "file_path": sym.get("file_path"),
                    "annotations": annotations,
                    "endpoints": [],
                })

            # 3. Services
            elif any("@service" in a for a in ann_lower) or name.endswith("Service"):
                is_transactional = any("@transactional" in a for a in ann_lower)
                services.append({
                    "name": name,
                    "file_path": sym.get("file_path"),
                    "annotations": annotations,
                    "is_transactional": is_transactional,
                })

            # 4. Repositories
            elif any("@repository" in a for a in ann_lower) or name.endswith("Repository"):
                repositories.append({
                    "name": name,
                    "file_path": sym.get("file_path"),
                    "annotations": annotations,
                })

            # 5. Entities
            elif any("@entity" in a for a in ann_lower) or any("@table" in a for a in ann_lower):
                entities.append({
                    "name": name,
                    "file_path": sym.get("file_path"),
                    "annotations": annotations,
                })

            # 6. DTOs
            elif name.endswith("DTO") or name.endswith("Request") or name.endswith("Response") or kind == "record":
                dtos.append({
                    "name": name,
                    "file_path": sym.get("file_path"),
                })

            # 7. Method-level Endpoint detection
            if kind == "method":
                endpoint_ann = [a for a in annotations if any(verb in a.lower() for verb in ["getmapping", "postmapping", "putmapping", "deletemapping", "requestmapping"])]
                if endpoint_ann:
                    verb, path = cls._parse_endpoint(endpoint_ann[0])
                    endpoints.append({
                        "controller": sym.get("container_name"),
                        "method": name,
                        "http_method": verb,
                        "path": path,
                        "return_type": sym.get("return_type"),
                        "line_number": sym.get("start_line"),
                    })

        # Architectural Layer Validation & Anti-Pattern Detection
        repo_names = {r["name"] for r in repositories}
        service_names = {s["name"] for s in services}

        for dep in dependencies:
            src = dep["source_symbol_name"]
            tgt = dep["target_symbol_name"]
            rel = dep["relation_type"]

            # Issue 1: Controller directly injecting/calling Repository (Bypassing Service layer)
            if src in {c["name"] for c in controllers} and tgt in repo_names and rel in ("INJECTS", "CALLS"):
                potential_issues.append({
                    "severity": "WARNING",
                    "code": "CONTROLLER_CALLS_REPOSITORY",
                    "message": f"Controller '{src}' directly accesses repository '{tgt}'. Consider delegating through a Service layer.",
                    "source": src,
                    "target": tgt,
                })

        # Issue 2: Entity returned directly by Controller without DTO
        entity_names = {e["name"] for e in entities}
        for ep in endpoints:
            ret = ep.get("return_type") or ""
            clean_ret = ret.replace("ResponseEntity<", "").replace("List<", "").replace("Optional<", "").replace(">", "").strip()
            if clean_ret in entity_names:
                potential_issues.append({
                    "severity": "INFO",
                    "code": "ENTITY_LEAK_IN_API",
                    "message": f"Endpoint '{ep['http_method']} {ep['path']}' directly exposes JPA Entity '{clean_ret}'. Consider returning a DTO to prevent internal state leakage.",
                    "endpoint": f"{ep['http_method']} {ep['path']}",
                })

        return {
            "controllers": controllers,
            "services": services,
            "repositories": repositories,
            "entities": entities,
            "dtos": dtos,
            "endpoints": endpoints,
            "potential_issues": potential_issues,
            "summary": {
                "controller_count": len(controllers),
                "service_count": len(services),
                "repository_count": len(repositories),
                "entity_count": len(entities),
                "endpoint_count": len(endpoints),
                "issues_count": len(potential_issues),
            },
        }

    @staticmethod
    def _parse_endpoint(ann_str: str) -> Tuple[str, str]:
        """Extracts HTTP verb and route path from Spring mapping annotation."""
        verb = "GET"
        ann_lower = ann_str.lower()
        if "postmapping" in ann_lower:
            verb = "POST"
        elif "putmapping" in ann_lower:
            verb = "PUT"
        elif "deletemapping" in ann_lower:
            verb = "DELETE"
        elif "patchmapping" in ann_lower:
            verb = "PATCH"

        path = "/"
        match = re.search(r'\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']', ann_str)
        if match:
            path = match.group(1)
        return verb, path

