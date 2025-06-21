# This file will be used by Alembic and to define base model class
from sqlalchemy.orm import as_declarative, declared_attr
from sqlalchemy import Column, Integer

@as_declarative()
class Base:
    id = Column(Integer, primary_key=True, index=True)
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        # Converts CamelCase to snake_case and adds 's' for plural
        import re
        name = re.sub(r'(?<!^)(?=[A-Z])', '_', cls.__name__).lower()
        if not name.endswith('s'): # simple pluralization
             name += 's'
        return name
