"""
Recording Manager

Handles LiveKit Egress call recording with automatic upload to Google Cloud Storage.
Supports participant recording (audio-only for phone calls).
"""

import os
import json
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from google.cloud import storage
from google.oauth2 import service_account
from livekit import api

logger = logging.getLogger(__name__)


class RecordingManager:
    """Manages call recordings using LiveKit Egress and GCS upload"""

    def __init__(self):
        self.gcs_bucket_name = os.environ.get("GCS_BUCKET_NAME")
        self.gcs_service_account_json = os.environ.get("GCS_SERVICE_ACCOUNT_JSON")
        self.livekit_url = os.environ.get("LIVEKIT_URL")
        self.livekit_api_key = os.environ.get("LIVEKIT_API_KEY")
        self.livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET")
        
        self._storage_client = None
        self._bucket = None
        self._livekit_api = None
        self._egress_client = None
        
        # Initialize GCS client (synchronous)
        self._initialize_gcs_client()
        # LiveKit client will be initialized lazily in async context
    
    def _initialize_gcs_client(self):
        """Initialize Google Cloud Storage client"""
        if not self.gcs_bucket_name or not self.gcs_service_account_json:
            logger.warning("⚠️ GCS credentials not found - recordings will be disabled")
            return
        
        try:
            # Parse service account JSON from environment
            service_account_info = json.loads(self.gcs_service_account_json)
            
            # Create credentials from service account info
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            
            # Initialize storage client
            self._storage_client = storage.Client(
                credentials=credentials,
                project=service_account_info.get('project_id')
            )
            self._bucket = self._storage_client.bucket(self.gcs_bucket_name)
            
            logger.info(f"✅ Initialized GCS client for bucket: {self.gcs_bucket_name}")
        
        except Exception as e:
            logger.error(f"❌ Failed to initialize GCS client: {e}")
            self._storage_client = None
            self._bucket = None
    
    async def _ensure_livekit_client(self):
        """Lazily initialize LiveKit API client in async context"""
        if self._egress_client is not None:
            return  # Already initialized
        
        if not self.livekit_url or not self.livekit_api_key or not self.livekit_api_secret:
            logger.warning("⚠️ LiveKit credentials not found - recordings will be disabled")
            return
        
        try:
            # Initialize LiveKit API client (async safe)
            self._livekit_api = api.LiveKitAPI(
                url=self.livekit_url,
                api_key=self.livekit_api_key,
                api_secret=self.livekit_api_secret
            )
            # Access egress service
            self._egress_client = self._livekit_api.egress
            logger.info("✅ Initialized LiveKit Egress client")
        
        except Exception as e:
            logger.error(f"❌ Failed to initialize LiveKit Egress client: {e}")
            self._egress_client = None
    
    @property
    def is_enabled(self) -> bool:
        """Check if recording is properly configured"""
        return (
            self._storage_client is not None and
            self._bucket is not None and
            self._egress_client is not None
        )
    
    async def start_room_recording(
        self,
        room_name: str,
        call_sid: str,
        audio_only: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Start recording a LiveKit room using Room Composite Egress
        
        Args:
            room_name: LiveKit room name
            call_sid: Call SID for organizing recordings
            audio_only: Record audio only (recommended for phone calls)
        
        Returns:
            Dictionary with egress_id and GCS file path if successful
        """
        # Ensure LiveKit client is initialized
        await self._ensure_livekit_client()
        
        if not self.is_enabled:
            logger.error("❌ Recording not enabled - missing credentials")
            return None
        
        try:
            # Generate GCS file path with date and call SID
            date_prefix = datetime.now().strftime("%Y/%m/%d")
            timestamp = datetime.now().strftime("%H%M%S")
            file_extension = "mp4"  # MP4 container for audio-only recordings
            gcs_filename = f"recordings/{date_prefix}/{call_sid}_{timestamp}.{file_extension}"
            
            logger.info(f"🎙️ Starting room recording for: {room_name}")
            logger.info(f"📁 GCS path: gs://{self.gcs_bucket_name}/{gcs_filename}")
            
            # Create Room Composite Egress request
            # Using direct upload (no streaming) - simpler and more reliable
            egress_info = await self._egress_client.start_room_composite_egress(
                api.RoomCompositeEgressRequest(
                    room_name=room_name,
                    audio_only=audio_only,
                    file_outputs=[
                        api.EncodedFileOutput(
                            file_type=api.EncodedFileType.MP4,
                            filepath=gcs_filename,
                            # Direct upload to GCS
                            gcp=api.GCPUpload(
                                bucket=self.gcs_bucket_name,
                                credentials=self.gcs_service_account_json
                            )
                        )
                    ]
                )
            )
            
            logger.info(f"✅ Recording started - Egress ID: {egress_info.egress_id}")
            
            return {
                "egress_id": egress_info.egress_id,
                "room_name": room_name,
                "call_sid": call_sid,
                "gcs_path": f"gs://{self.gcs_bucket_name}/{gcs_filename}",
                "gcs_filename": gcs_filename,
                "started_at": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"❌ Failed to start recording: {e}")
            return None
    
    async def get_recording_url(
        self,
        gcs_filename: str,
        expiration_days: int = 30
    ) -> Optional[str]:
        """
        Generate a signed URL for accessing a recording
        
        Args:
            gcs_filename: GCS file path (without gs:// prefix)
            expiration_days: URL expiration in days (default: 30)
        
        Returns:
            Signed URL if successful, None otherwise
        """
        if not self._bucket:
            logger.error("❌ GCS not initialized")
            return None
        
        try:
            blob = self._bucket.blob(gcs_filename)
            
            # Generate signed URL with expiration
            expiration = datetime.utcnow() + timedelta(days=expiration_days)
            signed_url = blob.generate_signed_url(
                expiration=expiration,
                method='GET'
            )
            
            logger.info(f"✅ Generated signed URL for: {gcs_filename}")
            return signed_url
        
        except Exception as e:
            logger.error(f"❌ Failed to generate signed URL: {e}")
            return None
    
    async def check_recording_status(self, egress_id: str) -> Optional[Dict[str, Any]]:
        """
        Check the status of a recording
        
        Args:
            egress_id: Egress ID returned from start_room_recording
        
        Returns:
            Status dictionary if successful, None otherwise
        """
        # Ensure LiveKit client is initialized
        await self._ensure_livekit_client()
        
        if not self._egress_client:
            logger.error("❌ Egress client not initialized")
            return None
        
        try:
            # Use list_egress with egress_id filter to get specific egress info
            response = await self._egress_client.list_egress(
                api.ListEgressRequest(egress_id=egress_id)
            )
            
            # Get first item from response
            if response.items:
                egress_info = response.items[0]
                return {
                    "egress_id": egress_info.egress_id,
                    "status": egress_info.status,
                    "room_name": egress_info.room_name,
                    "started_at": egress_info.started_at,
                    "ended_at": egress_info.ended_at if egress_info.ended_at else None
                }
            else:
                logger.warning(f"⚠️ No egress found with ID: {egress_id}")
                return None
        
        except Exception as e:
            logger.error(f"❌ Failed to check recording status: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    async def wait_for_recording_completion(
        self,
        egress_id: str,
        gcs_filename: str,
        max_wait_seconds: int = 60,
        poll_interval: float = 2.0
    ) -> Optional[str]:
        """
        Wait for recording to complete and return signed URL
        
        Args:
            egress_id: Egress ID from start_room_recording
            gcs_filename: GCS file path
            max_wait_seconds: Maximum time to wait for recording completion
            poll_interval: Seconds between status checks
        
        Returns:
            Signed URL if recording completes successfully, None otherwise
        """
        import asyncio
        from livekit import api
        
        logger.info(f"⏳ Waiting for recording to complete (egress_id: {egress_id})")
        
        start_time = asyncio.get_event_loop().time()
        
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            
            if elapsed > max_wait_seconds:
                logger.warning(f"⚠️ Recording wait timeout after {max_wait_seconds}s")
                return None
            
            # Check egress status
            status_info = await self.check_recording_status(egress_id)
            
            if not status_info:
                logger.error("❌ Failed to check recording status")
                return None
            
            status = status_info['status']
            logger.info(f"📹 Recording status: {status}")
            
            # Check if recording is complete
            if status == api.EgressStatus.EGRESS_COMPLETE:
                logger.info("✅ Recording completed successfully")
                
                # Wait a bit for file to be fully written to GCS
                await asyncio.sleep(1.0)
                
                # Verify file exists in GCS and generate URL
                if self._bucket:
                    try:
                        blob = self._bucket.blob(gcs_filename)
                        if blob.exists():
                            logger.info(f"✅ Recording file confirmed in GCS: {gcs_filename}")
                            # Generate signed URL
                            expiration = datetime.utcnow() + timedelta(days=30)
                            signed_url = blob.generate_signed_url(
                                expiration=expiration,
                                method='GET'
                            )
                            logger.info(f"✅ Generated signed URL for completed recording")
                            return signed_url
                        else:
                            logger.warning(f"⚠️ File not yet available in GCS, retrying...")
                    except Exception as e:
                        logger.error(f"❌ Error checking GCS file: {e}")
            
            elif status == api.EgressStatus.EGRESS_FAILED:
                logger.error("❌ Recording failed")
                return None
            
            # Still in progress, wait and retry
            await asyncio.sleep(poll_interval)
        
        return None


# Global instance
recording_manager = RecordingManager()
