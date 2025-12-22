"""
Error handling middleware for Vocode server
"""

import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json

logger = logging.getLogger(__name__)

class JSONErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle JSON decode errors gracefully"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            # Skip JSON parsing for GET requests and recording endpoints  
            if request.method == 'GET' or '/recordings/' in request.url.path:
                response = await call_next(request)
                return response
                
            # For recording endpoints, handle empty body gracefully
            if request.url.path.endswith('/recordings') and request.method == 'POST':
                try:
                    body = await request.body()
                    if not body or body.strip() == b'':
                        logger.info("📹 Empty body received for recordings endpoint - returning success")
                        return JSONResponse({"status": "success", "message": "Recording acknowledged"})
                    
                    # Try to parse JSON
                    json.loads(body)
                except json.JSONDecodeError:
                    logger.warning("📹 Invalid JSON in recordings endpoint - returning success anyway")
                    return JSONResponse({"status": "success", "message": "Recording acknowledged"})
                except Exception as e:
                    logger.warning(f"📹 Error processing recordings request: {e}")
                    return JSONResponse({"status": "success", "message": "Recording acknowledged"})
            
            response = await call_next(request)
            return response
            
        except json.JSONDecodeError as e:
            # Skip JSON errors for GET requests and recording endpoints
            if request.method == 'GET' or '/recordings/' in request.url.path:
                logger.info(f"Skipping JSON error for {request.method} {request.url.path}")
                response = await call_next(request)
                return response
            
            logger.error(f"JSON decode error on {request.url.path}: {e}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid JSON", "message": str(e)}
            )
        except Exception as e:
            logger.error(f"Unexpected error on {request.url.path}: {e}")
            return JSONResponse(
                status_code=500, 
                content={"error": "Internal server error", "message": str(e)}
            )