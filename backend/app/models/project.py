"""
CodeMate AI — Phase 7 Project Intelligence Models
Models representing imported projects, files, symbols, dependency graph edges, patches, and workflows.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid, utc_now

if TYPE_CHECKING:
    from app.models.user import User


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    framework: Mapped[str] = mapped_column(String(50), default="generic", nullable=False)  # spring-boot, fastapi, etc.
    primary_language: Mapped[str] = mapped_column(String(50), default="java", nullable=False)
    build_tool: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # maven, gradle, pip, npm
    root_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    indexed_file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_indexed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User")
    files: Mapped[List["ProjectFile"]] = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    symbols: Mapped[List["ProjectSymbol"]] = relationship("ProjectSymbol", back_populates="project", cascade="all, delete-orphan")
    dependencies: Mapped[List["ProjectDependency"]] = relationship("ProjectDependency", back_populates="project", cascade="all, delete-orphan")
    patches: Mapped[List["ProjectPatch"]] = relationship("ProjectPatch", back_populates="project", cascade="all, delete-orphan")
    workflows: Mapped[List["ProjectWorkflow"]] = relationship("ProjectWorkflow", back_populates="project", cascade="all, delete-orphan")


class ProjectFile(Base, TimestampMixin):
    __tablename__ = "project_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)  # relative to project root
    file_name: Mapped[str] = mapped_column(String(200), nullable=False)
    file_extension: Mapped[str] = mapped_column(String(20), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    line_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_excluded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_test: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="files")
    symbols: Mapped[List["ProjectSymbol"]] = relationship("ProjectSymbol", back_populates="file", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("project_id", "file_path", name="uq_project_file_path"),
    )


class ProjectSymbol(Base):
    __tablename__ = "project_symbols"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_files.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    symbol_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    symbol_type: Mapped[str] = mapped_column(String(50), nullable=False)  # class, interface, method, constructor, field, endpoint, entity
    container_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    package_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    return_type: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    parameters_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    annotations_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    visibility: Mapped[str] = mapped_column(String(20), default="public", nullable=False)
    documentation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="symbols")
    file: Mapped["ProjectFile"] = relationship("ProjectFile", back_populates="symbols")


class ProjectDependency(Base):
    __tablename__ = "project_dependencies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_symbol_name: Mapped[str] = mapped_column(String(200), nullable=False)
    target_symbol_name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    target_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # IMPORTS, DEFINES, EXTENDS, IMPLEMENTS, INJECTS, CALLS, USES, MAPS_TO, TESTS
    confidence: Mapped[str] = mapped_column(String(20), default="confirmed", nullable=False)  # confirmed, inferred, unknown
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="dependencies")


class ProjectIndexJob(Base, TimestampMixin):
    __tablename__ = "project_index_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="queued", nullable=False)  # queued, indexing, completed, failed, cancelled
    total_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    indexed_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ProjectPatch(Base, TimestampMixin):
    __tablename__ = "project_patches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_description: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="proposed", nullable=False)  # proposed, approved, applied, rejected, rolled_back
    patch_summary: Mapped[str] = mapped_column(Text, nullable=False)
    rollback_data_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="patches")
    files: Mapped[List["ProjectPatchFile"]] = relationship("ProjectPatchFile", back_populates="patch", cascade="all, delete-orphan")


class ProjectPatchFile(Base):
    __tablename__ = "project_patch_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patch_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_patches.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    operation: Mapped[str] = mapped_column(String(20), default="modify", nullable=False)  # modify, create, delete, rename
    original_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    new_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    diff_content: Mapped[str] = mapped_column(Text, nullable=False)
    new_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending, approved, rejected, applied, reverted
    explanation: Mapped[str] = mapped_column(String(500), default="", nullable=False)

    patch: Mapped["ProjectPatch"] = relationship("ProjectPatch", back_populates="files")


class ProjectWorkflow(Base, TimestampMixin):
    __tablename__ = "project_workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_type: Mapped[str] = mapped_column(String(50), default="analyze_plan_fix", nullable=False)
    current_stage: Mapped[str] = mapped_column(String(50), default="DISCOVERING", nullable=False)
    stage_progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)  # active, paused, completed, failed, cancelled
    task_input: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    log_events_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="workflows")
