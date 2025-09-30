"""
This module contains utility functions for user authentication and authorization using Clerk SDK.
This is a helper module with functions used to authenticate frontend requests to the backend.

"""
    



from clerk_backend_API import Clerk,AuthenticateRequestOptions

from fastapi import HTTPException
import os
from dotenv import load_dotenv


load_dotenv() # Load environment variables from .env file(it looks for .env file in the root directory by default)
clerk_sdk=Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY")) #This is my secret key


def authenticate_and_get_user(request):
    
    try:
        request_state=clerk_sdk.authenticate_request(request,
                                                     AuthenticateRequestOptions(authorized_parties=["https://localhost:5173","http://localhost:5173"],
                                                     jwt_key=os.getenv("JWT_SECRET_KEY") ))#only allows users from these ports to access the backend
        
        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail=("Invalid Token")) #if not signed in raise 401 error 
        
        user_id = request_state.payload.get("sub")#sub is the user id in clerk(encoded in the jwt token) and decoded by clerk_sdk.authenticate_request
        
        return {"user_id":user_id}#returning user id to the caller function
                                
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unauthorized/Invalid Credentials   ")