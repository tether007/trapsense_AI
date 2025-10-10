"""
This module contains utility functions for user authentication and authorization using Clerk SDK.
This is a helper module with functions used to authenticate frontend requests to the backend.

"""

from clerk_backend_api import Clerk,AuthenticateRequestOptions

from fastapi import HTTPException
import os
from dotenv import load_dotenv
from collections import namedtuple


UserObj = namedtuple("UserObj", ["id"])

load_dotenv() # Load environment variables from .env file
clerk_sdk=Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY")) #This is my secret key in the sense dev's


def authenticate_and_get_user(request):
    try:
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:5173","http://localhost:5174"],
                jwt_key=os.getenv("JWT_SECRET_KEY")
            )
        )

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Invalid Token")

        #sub claim(clerk user id) to our String uuid is vague
        user_id_str = request_state.payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return UserObj(id=user_id_str)

    except HTTPException:
        # Re-raise HTTPExceptions (like 401) as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized/Invalid Credentials: {str(e)}")
