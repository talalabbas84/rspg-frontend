# This file makes the 'models' directory a Python package
# and allows for easier imports of models.

# Import all models here to make them accessible via app.models.<ModelName>
# This is also crucial for Alembic to detect all models.
from .user import User
from .sequence import Sequence
from .block import Block, BlockTypeEnum
from .variable import Variable, VariableTypeEnum
from .run import Run, BlockRun, RunStatusEnum
from .global_list import GlobalList, GlobalListItem

# You can also define __all__ if you want to control what `from app.models import *` imports
__all__ = [
    "User",
    "Sequence",
    "Block",
    "BlockTypeEnum",
    "Variable",
    "VariableTypeEnum",
    "Run",
    "BlockRun",
    "RunStatusEnum",
    "GlobalList",
    "GlobalListItem",
    "Base" # from app.db.base
]

# Import Base from app.db.base so Alembic can find it via app.models.Base
from app.db.base import Base
