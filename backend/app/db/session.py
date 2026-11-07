"""
CodeMate AI — Database Session & Engine Configuration
Production-hardened async SQLAlchemy configuration with Write-Ahead Logging (WAL),
connection pooling, foreign-key enforcement, plan synchronization, and promo code seeding.
"""

import json
from typing import AsyncGenerator, Dict, Any
from sqlalchemy import delete, event, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.logging import logger
from app.db.base import Base, utc_now
import app.models  # Ensure all models are registered on Base.metadata
from app.models.subscription import Plan, PromoCode

# Detect available PostgreSQL drivers and build active async database URL
def _resolve_database_url() -> tuple[str, bool]:
    raw_url = (settings.async_database_url or "").strip()
    is_pg = "postgresql" in raw_url.lower() or "postgres" in raw_url.lower()

    if not is_pg:
        return raw_url, True

    # Check asyncpg
    has_asyncpg = False
    try:
        import asyncpg  # noqa: F401
        has_asyncpg = True
    except ImportError:
        pass

    # Check psycopg (v3 async)
    has_psycopg = False
    try:
        import psycopg  # noqa: F401
        has_psycopg = True
    except ImportError:
        pass

    if has_asyncpg:
        return raw_url, False

    if has_psycopg:
        adapted = raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg://")
        if not adapted.startswith("postgresql+psycopg://"):
            adapted = adapted.replace("postgresql://", "postgresql+psycopg://", 1)
        logger.info("[Database] Using 'psycopg' async driver for PostgreSQL connection.")
        return adapted, False

    # Neither driver is installed
    logger.warning(
        "\n"
        "===============================================================================\n"
        "[DATABASE DRIVER NOTICE] PostgreSQL connection configured in .env,\n"
        "but neither 'asyncpg' nor 'psycopg' is currently installed in the environment.\n"
        "To connect to Neon PostgreSQL, install either driver:\n"
        "    pip install asyncpg\n"
        "  OR (prebuilt binary):\n"
        "    pip install psycopg[binary]\n"
        "Falling back gracefully to local SQLite (WAL) database (codemate.db) for now.\n"
        "===============================================================================\n"
    )
    return "sqlite+aiosqlite:///./codemate.db", True

resolved_database_url, is_sqlite = _resolve_database_url()

# Build production engine arguments
engine_kwargs: Dict[str, Any] = {
    "echo": False,
    "future": True,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {
        "check_same_thread": False,
        "timeout": 60,  # 60s timeout for lock contention
    }
else:
    # Production PostgreSQL connection pooling
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_pre_ping": True,
    })

engine = create_async_engine(resolved_database_url, **engine_kwargs)

# For SQLite, enforce Write-Ahead Logging (WAL) and foreign keys on every connection
if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=60000")
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB memory cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding a transactional async database session.
    Automatically handles rollback on unhandled exceptions and closes session cleanly.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """
    Gracefully drains and disposes the database connection pool on application shutdown.
    Prevents connection leaks and orphan processes.
    """
    logger.info("[Database] Draining database connection pool...")
    await engine.dispose()
    logger.info("[Database] Database connection pool disposed successfully.")


async def check_db_health() -> dict:
    """
    Performs an active database ping to verify latency and connection integrity.
    """
    try:
        t0 = utc_now()
        async with async_session_factory() as session:
            await session.execute(select(1))
        t1 = utc_now()
        latency_ms = round((t1 - t0).total_seconds() * 1000, 2)
        return {
            "status": "healthy",
            "latency_ms": latency_ms,
            "engine": "sqlite (WAL)" if is_sqlite else "postgresql",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "engine": "sqlite" if is_sqlite else "postgresql",
        }


async def init_db() -> None:
    """
    Initializes database tables, creates schema, and synchronizes default plans & promo codes.
    """
    logger.info(f"[Database] Initializing database at: {settings.DATABASE_URL.split('@')[-1]}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Self-healing column migration for SQLite during local development & production updates
        if is_sqlite:
            def migrate_sqlite_columns(sync_conn):
                res = sync_conn.execute(text("PRAGMA table_info(payments)"))
                existing_cols = {row[1] for row in res.fetchall()}
                if existing_cols and "coupon_code" not in existing_cols:
                    sync_conn.execute(text("ALTER TABLE payments ADD COLUMN coupon_code VARCHAR(32)"))
                if existing_cols and "discount_amount" not in existing_cols:
                    sync_conn.execute(text("ALTER TABLE payments ADD COLUMN discount_amount INTEGER DEFAULT 0 NOT NULL"))

            await conn.run_sync(migrate_sqlite_columns)

    # Seed or synchronize default plans: ONLY Free Tier and the TWO official paid plans (₹21/day Core Pass, ₹61/week AutoPilot Pass)
    async with async_session_factory() as session:
        default_plans = [
            Plan(
                id="free",
                name="Free Tier",
                description="Free models only • Manual copy-paste, 5 requests/day on 1 device",
                price=0,
                currency="INR",
                billing_interval="lifetime",
                device_limit=1,
                concurrent_session_limit=1,
                ai_usage_limit=5,
                feature_entitlements=json.dumps(["analyze", "explain", "generate"]),
                active=True,
            ),
            Plan(
                id="core_daily",
                name="Core Pass",
                description="₹21/day • Manual copy-paste, 25 requests/day on 1 device",
                price=2100,  # ₹21 in paise
                currency="INR",
                billing_interval="day",
                device_limit=1,
                concurrent_session_limit=1,
                ai_usage_limit=25,
                feature_entitlements=json.dumps(["analyze", "explain", "generate", "optimize", "fix"]),
                active=True,
            ),
            Plan(
                id="autopilot_weekly",
                name="AutoPilot Pass",
                description="₹61/week • 1-click insertion, Smart Practice Assistant & unlimited BYOK on 1 device",
                price=6100,  # ₹61 in paise
                currency="INR",
                billing_interval="week",
                device_limit=1,
                concurrent_session_limit=1,
                ai_usage_limit=100,
                feature_entitlements=json.dumps([
                    "analyze",
                    "explain",
                    "generate",
                    "optimize",
                    "fix",
                    "autopilot",
                    "one_click_insert",
                    "byok",
                    "project_intelligence",
                ]),
                active=True,
            ),
        ]

        seeded_count = 0
        for plan in default_plans:
            existing = await session.get(Plan, plan.id)
            if not existing:
                session.add(plan)
                seeded_count += 1
            else:
                existing.name = plan.name
                existing.description = plan.description
                existing.price = plan.price
                existing.currency = plan.currency
                existing.billing_interval = plan.billing_interval
                existing.device_limit = plan.device_limit
                existing.concurrent_session_limit = plan.concurrent_session_limit
                existing.ai_usage_limit = plan.ai_usage_limit
                existing.feature_entitlements = plan.feature_entitlements
                existing.active = plan.active

        # Deactivate any other legacy plans (e.g. autopilot_daily, student, pro, premium) so that ONLY the 2 paid plans exist
        await session.execute(
            update(Plan)
            .where(~Plan.id.in_(["free", "core_daily", "autopilot_weekly"]))
            .values(active=False)
        )

        # Clean up legacy predefined coupons so coupon management is 100% admin-managed
        await session.execute(
            delete(PromoCode).where(
                PromoCode.code.in_(["STUDENT50", "CONTEST80", "CAMPUS100", "FREEPASS", "AMBASSADOR", "HACKATHON"])
            )
        )
        await session.commit()
        if seeded_count > 0:
            logger.info(f"[Database] Synchronized {seeded_count} plan(s). Exactly 2 paid plans active: ₹21/day and ₹61/week.")
