"""
Recording Uploader

This module downloads Twilio recording files and uploads them to Google Cloud Storage,
returning the public URL for use in webhooks and transcript completion.
"""

import os
import asyncio
import aiohttp
import aiofiles
import tempfile
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import json
from google.cloud import storage
from google.oauth2 import service_account
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class RecordingUploader:
    """Downloads Twilio recordings and uploads them to GCP Storage"""

    def __init__(self,
                 service_account_path: str = "boostmydeal-dc83797b0605.json",
                 bucket_name: str = "boostmydeal-transcription"):
        self.service_account_path = service_account_path
        self.bucket_name = bucket_name
        self._storage_client = None
        self._bucket = None

        # Initialize GCP client
        self._initialize_gcp_client()

    def _initialize_gcp_client(self):
        """Initialize Google Cloud Storage client with service account"""
        try:
            # Load service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_path,
                scopes=['https://www.googleapis.com/auth/cloud-platform'])

            # Initialize storage client
            self._storage_client = storage.Client(credentials=credentials)
            self._bucket = self._storage_client.bucket(self.bucket_name)

            logger.info(
                f"✅ Initialized GCP Storage client for bucket: {self.bucket_name}"
            )

        except Exception as e:
            logger.error(f"❌ Failed to initialize GCP Storage client: {e}")
            self._storage_client = None
            self._bucket = None

    async def download_recording(
            self,
            recording_url: str,
            temp_dir: str,
            twilio_auth: Optional[aiohttp.BasicAuth] = None) -> Optional[str]:
        """
        Download recording file from Twilio URL
        
        Args:
            recording_url: Twilio recording URL
            temp_dir: Temporary directory to save file
            
        Returns:
            Local file path if successful, None otherwise
        """
        try:
            # Extract filename from URL or generate one
            parsed_url = urlparse(recording_url)
            if parsed_url.path.endswith(('.wav', '.mp3')):
                filename = f"recording_{datetime.now().strftime('%Y%m%d_%H%M%S')}{parsed_url.path[-4:]}"
            else:
                filename = f"recording_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
            local_file_path = os.path.join(temp_dir, filename)

            logger.info(f"⬇️ Downloading recording from: {recording_url}")

            # Get Twilio credentials from environment if not provided
            if not twilio_auth:
                account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
                auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
                if account_sid and auth_token:
                    twilio_auth = aiohttp.BasicAuth(account_sid, auth_token)

            async with aiohttp.ClientSession() as session:
                async with session.get(recording_url,
                                       auth=twilio_auth) as response:
                    if response.status == 200:
                        async with aiofiles.open(local_file_path,
                                                 'wb') as file:
                            async for chunk in response.content.iter_chunked(
                                    8192):
                                await file.write(chunk)

                        logger.info(
                            f"✅ Downloaded recording to: {local_file_path}")
                        return local_file_path
                    else:
                        logger.error(
                            f"❌ Failed to download recording: HTTP {response.status}"
                        )
                        return None

        except Exception as e:
            logger.error(f"❌ Error downloading recording: {e}")
            return None

    def upload_to_gcp(self, local_file_path: str,
                      call_sid: str) -> Optional[str]:
        """
        Upload recording file to Google Cloud Storage
        
        Args:
            local_file_path: Local path to recording file
            call_sid: Twilio Call SID for organizing files
            
        Returns:
            Public GCP Storage URL if successful, None otherwise
        """
        if not self._storage_client or not self._bucket:
            logger.error("❌ GCP Storage client not initialized")
            return None

        try:
            # Generate GCP blob name with date and call SID
            date_prefix = datetime.now().strftime("%Y/%m/%d")
            filename = os.path.basename(local_file_path)
            blob_name = f"recordings/{date_prefix}/{call_sid}_{filename}"

            # Upload file
            blob = self._bucket.blob(blob_name)

            logger.info(f"⬆️ Uploading to GCP Storage: {blob_name}")

            with open(local_file_path, 'rb') as file:
                blob.upload_from_file(file, content_type='audio/wav')

            # Generate a signed URL instead of making blob public (more secure)
            # URL expires in 30 days
            expiration = datetime.utcnow() + timedelta(days=30)
            signed_url = blob.generate_signed_url(expiration=expiration,
                                                  method='GET')

            public_url = signed_url

            logger.info(
                f"✅ Successfully uploaded recording to GCP: {public_url}")
            return public_url

        except Exception as e:
            logger.error(f"❌ Error uploading to GCP Storage: {e}")
            return None

    async def process_recording(
            self,
            recording_url: str,
            call_sid: str,
            twilio_auth: Optional[aiohttp.BasicAuth] = None) -> Optional[str]:
        """
        Complete process: download from Twilio, upload to GCP, return public URL
        
        Args:
            recording_url: Twilio recording URL
            call_sid: Twilio Call SID
            
        Returns:
            Public GCP Storage URL if successful, None otherwise
        """
        if not recording_url or not call_sid:
            logger.error("❌ Recording URL and Call SID are required")
            return None

        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"📁 Created temporary directory for recording download")
            try:
                # Download recording from Twilio
                local_file_path = await self.download_recording(
                    recording_url, temp_dir, twilio_auth)
                if not local_file_path:
                    return None

                # Log file size before upload
                file_size = os.path.getsize(local_file_path)
                logger.info(f"📊 Downloaded file size: {file_size / (1024*1024):.2f} MB")

                # Upload to GCP Storage
                gcp_url = self.upload_to_gcp(local_file_path, call_sid)
                if not gcp_url:
                    return None

                logger.info(
                    f"🎉 Recording processing complete: {recording_url} -> {gcp_url}"
                )
                return gcp_url

            except Exception as e:
                logger.error(f"❌ Error processing recording: {e}")
                return None
            finally:
                # Log cleanup (happens automatically when context exits)
                logger.info(f"🧹 Temporary files automatically cleaned up from local storage")

    async def process_multiple_recordings(
        self,
        recording_urls: list,
        call_sid: str,
        twilio_auth: Optional[aiohttp.BasicAuth] = None
    ) -> Dict[str, Optional[str]]:
        """
        Process multiple recordings for a call
        
        Args:
            recording_urls: List of Twilio recording URLs
            call_sid: Twilio Call SID
            
        Returns:
            Dictionary mapping original URLs to GCP URLs
        """
        results = {}

        for recording_url in recording_urls:
            gcp_url = await self.process_recording(recording_url, call_sid,
                                                   twilio_auth)
            results[recording_url] = gcp_url

        return results


# Global instance
recording_uploader = RecordingUploader()


async def upload_recording_to_gcp(
        recording_url: str,
        call_sid: str,
        twilio_auth: Optional[aiohttp.BasicAuth] = None) -> Optional[str]:
    """
    Convenience function to upload a single recording
    
    Args:
        recording_url: Twilio recording URL
        call_sid: Twilio Call SID
        
    Returns:
        Public GCP Storage URL if successful, None otherwise
    """
    return await recording_uploader.process_recording(recording_url, call_sid,
                                                      twilio_auth)


async def upload_recordings_to_gcp(
    recording_urls: list,
    call_sid: str,
    twilio_auth: Optional[aiohttp.BasicAuth] = None
) -> Dict[str, Optional[str]]:
    """
    Convenience function to upload multiple recordings
    
    Args:
        recording_urls: List of Twilio recording URLs
        call_sid: Twilio Call SID
        
    Returns:
        Dictionary mapping original URLs to GCP URLs
    """
    return await recording_uploader.process_multiple_recordings(
        recording_urls, call_sid, twilio_auth)
