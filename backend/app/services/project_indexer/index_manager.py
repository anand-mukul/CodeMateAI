"""
CodeMate AI — Phase 7 Index Manager
Orchestrates incremental file scanning, AST parsing, symbol extraction,
and dependency graph persistence into PostgreSQL/SQLite.
"""

import hashlib
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utc_now
from app.models.project import Project, ProjectDependency, ProjectFile, ProjectIndexJob, ProjectSymbol
from app.services.project_indexer.parsers.config_parser import ConfigParser
from app.services.project_indexer.parsers.java_parser import JavaParser
from app.services.project_indexer.parsers.python_parser import PythonParser
from app.services.project_indexer.project_graph import ProjectGraph
from app.services.project_indexer.spring_boot_analyzer import SpringBootAnalyzer


class IndexManager:
    """Manages project indexing lifecycle, change detection, and graph generation."""

    @classmethod
    async def index_project(
        cls,
        db: AsyncSession,
        project: Project,
        files_data: List[Dict],
        job: Optional[ProjectIndexJob] = None,
    ) -> Dict:
        """
        Indexes or incrementally updates a project from file dictionaries.
        """
        start_time = time.time()
        if job:
            job.status = "indexing"
            job.total_files = len(files_data)
            await db.commit()

        # 1. Fetch existing indexed files for change detection (content-hash caching)
        query = select(ProjectFile).where(ProjectFile.project_id == project.id)
        result = await db.execute(query)
        existing_files = {f.file_path: f for f in result.scalars().all()}

        indexed_count = 0
        all_symbols: List[Dict] = []
        all_dependencies: List[Dict] = []

        for file_dict in files_data:
            rel_path = file_dict["file_path"]
            content = file_dict.get("content", "")
            content_hash = file_dict.get("content_hash") or hashlib.sha256(content.encode("utf-8")).hexdigest()
            language = file_dict.get("language", "text")

            existing = existing_files.get(rel_path)

            # Check if unchanged (Incremental Indexing Optimization)
            if existing and existing.content_hash == content_hash and existing.last_parsed_at:
                # File unchanged, reuse existing symbols from database
                sym_query = select(ProjectSymbol).where(ProjectSymbol.file_id == existing.id)
                sym_res = await db.execute(sym_query)
                for s in sym_res.scalars().all():
                    all_symbols.append({
                        "symbol_name": s.symbol_name,
                        "symbol_type": s.symbol_type,
                        "container_name": s.container_name,
                        "package_name": s.package_name,
                        "file_path": s.file_path,
                        "annotations_json": s.annotations_json,
                        "start_line": s.start_line,
                        "end_line": s.end_line,
                        "return_type": s.return_type,
                    })
                indexed_count += 1
                continue

            # File is new or changed: save / update ProjectFile
            if existing:
                file_record = existing
                file_record.content_hash = content_hash
                file_record.content = content
                file_record.size_bytes = len(content.encode("utf-8"))
                file_record.line_count = len(content.splitlines())
                file_record.last_parsed_at = utc_now()
                # Clear old symbols and dependencies for this file
                await db.execute(delete(ProjectSymbol).where(ProjectSymbol.file_id == file_record.id))
                await db.execute(delete(ProjectDependency).where(
                    (ProjectDependency.project_id == project.id) & (ProjectDependency.source_file_path == rel_path)
                ))
            else:
                file_record = ProjectFile(
                    project_id=project.id,
                    file_path=rel_path,
                    file_name=file_dict.get("file_name", rel_path.split("/")[-1]),
                    file_extension=file_dict.get("file_extension", "." + rel_path.split(".")[-1] if "." in rel_path else ""),
                    language=language,
                    content_hash=content_hash,
                    size_bytes=len(content.encode("utf-8")),
                    line_count=len(content.splitlines()),
                    is_excluded=False,
                    is_test=file_dict.get("is_test", False),
                    content=content,
                    last_parsed_at=utc_now(),
                )
                db.add(file_record)
                await db.flush()

            # Parse language specific symbols
            parsed_data = {"symbols": [], "dependencies": []}
            if language == "java":
                parsed_data = JavaParser.parse_source(content, rel_path)
            elif language == "python":
                parsed_data = PythonParser.parse_source(content, rel_path)
            elif language == "xml" and rel_path.endswith("pom.xml"):
                pom_data = ConfigParser.parse_pom_xml(content)
                if pom_data.get("spring_boot_version"):
                    project.framework = "spring-boot"
                    project.build_tool = "maven"

            # Persist symbols
            for sym_dict in parsed_data["symbols"]:
                sym_record = ProjectSymbol(
                    project_id=project.id,
                    file_id=file_record.id,
                    file_path=rel_path,
                    symbol_name=sym_dict["symbol_name"],
                    symbol_type=sym_dict["symbol_type"],
                    container_name=sym_dict.get("container_name"),
                    package_name=sym_dict.get("package_name"),
                    return_type=sym_dict.get("return_type"),
                    parameters_json=sym_dict.get("parameters_json"),
                    annotations_json=sym_dict.get("annotations_json"),
                    start_line=sym_dict.get("start_line", 1),
                    end_line=sym_dict.get("end_line", 1),
                    visibility=sym_dict.get("visibility", "public"),
                    documentation=sym_dict.get("documentation"),
                )
                db.add(sym_record)
                sym_dict["file_path"] = rel_path
                all_symbols.append(sym_dict)

            # Persist dependencies
            for dep_dict in parsed_data["dependencies"]:
                dep_record = ProjectDependency(
                    project_id=project.id,
                    source_symbol_name=dep_dict["source_symbol_name"],
                    target_symbol_name=dep_dict["target_symbol_name"],
                    source_file_path=rel_path,
                    target_file_path=None,
                    relation_type=dep_dict["relation_type"],
                    confidence=dep_dict.get("confidence", "confirmed"),
                    line_number=dep_dict.get("line_number"),
                )
                db.add(dep_record)
                all_dependencies.append(dep_dict)

            indexed_count += 1

        # 2. Update Project Metadata
        project.indexed_file_count = indexed_count
        project.total_file_count = len(files_data)
        project.last_indexed_at = utc_now()

        # 3. Analyze Spring Boot Components & Architecture
        spring_intel = SpringBootAnalyzer.analyze_components(all_symbols, all_dependencies)

        duration_ms = int((time.time() - start_time) * 1000)
        if job:
            job.status = "completed"
            job.indexed_files = indexed_count
            job.duration_ms = duration_ms

        await db.commit()

        # 4. Construct Graph
        graph = ProjectGraph(all_symbols, all_dependencies)

        return {
            "project_id": project.id,
            "total_files": len(files_data),
            "indexed_files": indexed_count,
            "symbols_count": len(all_symbols),
            "dependencies_count": len(all_dependencies),
            "duration_ms": duration_ms,
            "spring_intelligence": spring_intel,
            "graph": graph.to_graph_data(),
        }

