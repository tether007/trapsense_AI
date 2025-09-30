from fastapi import APIRouter, Depends, HTTPException,Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.db import(
    get_user_by_id,
    create_user,
)    

from ..utils.utils import authenticate_and_get_user # Import the utility function
from ..database.models import get_db
import json
from datetime import datetime



router = APIRouter() # initialize the router




