from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL, BASE_DIR

ACTIVE_DB_ENGINE_NAME = "PostgreSQL"


def _build_engine():
    global ACTIVE_DB_ENGINE_NAME
    target_url = DATABASE_URL.strip()

    if target_url.startswith("postgres"):
        try:
            url_obj = make_url(target_url)
            db_name = url_obj.database or "hr_automation"
            # Connect to default 'postgres' database first to ensure target database exists
            admin_url = url_obj.set(database="postgres")
            admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)
            with admin_engine.connect() as conn:
                exists = conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :d"), {"d": db_name}
                ).scalar()
                if not exists:
                    conn.execute(text(f'CREATE DATABASE "{db_name}"'))
            admin_engine.dispose()

            pg_engine = create_engine(target_url, pool_pre_ping=True)
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            ACTIVE_DB_ENGINE_NAME = f"PostgreSQL ({db_name})"
            return pg_engine
        except Exception as exc:
            print(
                f"[Database] PostgreSQL server at '{target_url}' is not reachable ({exc}). "
                "Using local persistent database file until PostgreSQL service is started."
            )

    sqlite_url = f"sqlite:///{BASE_DIR / 'hr_automation.db'}"
    ACTIVE_DB_ENGINE_NAME = "PostgreSQL-Compatible Local DB (SQLite Fallback)"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
