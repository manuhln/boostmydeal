"""
Twilio Cost Fetcher

This module provides functionality to fetch real call costs from Twilio's REST API
using the Call SID after a call has been completed.
"""

import os
import asyncio
import aiohttp
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import time

logger = logging.getLogger(__name__)


class TwilioCostFetcher:
    """Fetches real call costs from Twilio REST API"""

    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")

        if not self.account_sid or not self.auth_token:
            logger.warning(
                "⚠️ Twilio credentials not found. Real cost fetching will be disabled."
            )

        # Twilio API base URL
        if self.account_sid:
            self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
        else:
            self.base_url = None

    def configure_credentials(self, account_sid: str, auth_token: str):
        """Configure Twilio credentials from call payload"""
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}"
        logger.info(
            f"✅ Configured Twilio credentials for cost fetching: {account_sid[:8]}..."
        )

    async def fetch_recording_urls(self, call_sid: str) -> List[str]:
        """
        Fetch recording URLs for a given Call SID from Twilio API
        
        Args:
            call_sid: Twilio Call SID (starts with 'CA')
            
        Returns:
            List of recording URLs for the call
        """
        if not self.account_sid or not self.auth_token:
            logger.error(
                "❌ Twilio credentials not configured for recording fetch")
            return []

        if not call_sid or not call_sid.startswith('CA'):
            logger.error(f"❌ Invalid Call SID for recording fetch: {call_sid}")
            return []

        url = f"{self.base_url}/Calls/{call_sid}/Recordings.json"
        auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)

        logger.info(
            f"🎙️ Fetching recording URLs for call {call_sid} from Twilio API..."
        )

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, auth=auth) as response:
                    if response.status == 200:
                        recordings_data = await response.json()
                        recordings = recordings_data.get('recordings', [])

                        if recordings:
                            recording_urls = []
                            for recording in recordings:
                                recording_sid = recording.get('sid', '')
                                if recording_sid:
                                    # Construct media URL for recording download
                                    recording_url = f"{self.base_url}/Recordings/{recording_sid}"
                                    recording_urls.append({
                                        "recording_sid":
                                        recording_sid,
                                        "recording_url":
                                        recording_url,
                                        "duration":
                                        recording.get('duration', '0'),
                                        "channels":
                                        recording.get('channels', 1),
                                        "file_format":
                                        "wav"
                                    })

                            logger.info(
                                f"✅ Found {len(recording_urls)} recordings for call {call_sid}"
                            )
                            return recording_urls
                        else:
                            logger.info(
                                f"📭 No recordings found for call {call_sid}")
                            return []
                    else:
                        logger.error(
                            f"❌ Failed to fetch recordings: HTTP {response.status}"
                        )
                        return []

        except Exception as e:
            logger.error(f"❌ Error fetching recording URLs: {e}")
            return []

    async def fetch_call_cost(
            self,
            call_sid: str,
            max_retries: int = 10,
            retry_delay: float = 2.0) -> Optional[Dict[str, Any]]:
        """
        Fetch real call cost from Twilio API
        
        Args:
            call_sid: Twilio Call SID (starts with 'CA')
            max_retries: Maximum number of retries to get cost data
            retry_delay: Delay between retries in seconds
            
        Returns:
            Dictionary with call cost data or None if failed
        """
        if not self.account_sid or not self.auth_token:
            logger.error("❌ Twilio credentials not configured")
            return None

        if not call_sid or not call_sid.startswith('CA'):
            logger.error(f"❌ Invalid Call SID: {call_sid}")
            return None

        url = f"{self.base_url}/Calls/{call_sid}.json"

        # Basic auth credentials
        auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)

        logger.info(
            f"💰 Fetching real cost for call {call_sid} from Twilio API...")

        async with aiohttp.ClientSession() as session:
            for attempt in range(max_retries):
                try:
                    async with session.get(url, auth=auth) as response:
                        if response.status == 200:
                            call_data = await response.json()

                            # Check if price is available
                            price = call_data.get('price')
                            if price is not None and price != '0' and price != 0:
                                # Price is available - parse and return
                                cost_data = self._parse_call_data(call_data)
                                logger.info(
                                    f"✅ Successfully fetched real cost: ${abs(float(price)):.6f} for call {call_sid}"
                                )
                                return cost_data
                            elif attempt == max_retries - 1:
                                # Price still not available after retries, calculate fallback cost
                                logger.info(
                                    f"💰 Price not directly available, calculating fallback cost based on duration and standard rates..."
                                )
                                fallback_cost = self._calculate_fallback_cost(
                                    call_data)
                                if fallback_cost:
                                    logger.info(
                                        f"✅ Calculated fallback cost: ${fallback_cost['cost_usd']:.6f} for call {call_sid}"
                                    )
                                    return fallback_cost
                                else:
                                    logger.warning(
                                        f"⚠️ Could not calculate cost for call {call_sid}"
                                    )
                                    return None
                            else:
                                # Price not yet available, retry
                                logger.info(
                                    f"⏳ Price not yet available for call {call_sid} (attempt {attempt + 1}/{max_retries})"
                                )
                                if attempt < max_retries - 1:
                                    await asyncio.sleep(retry_delay)
                                    continue
                        else:
                            logger.error(
                                f"❌ Twilio API error: {response.status} - {await response.text()}"
                            )
                            return None

                except Exception as e:
                    logger.error(
                        f"❌ Error fetching call cost (attempt {attempt + 1}): {e}"
                    )
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                    else:
                        return None

        return None

    def _parse_call_data(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Twilio call data into standardized format"""
        try:
            # Extract key fields
            price = call_data.get('price', '0')
            price_unit = call_data.get('price_unit', 'USD')
            duration = call_data.get('duration', '0')
            status = call_data.get('status', 'unknown')
            direction = call_data.get('direction', 'unknown')
            from_number = call_data.get('from', '')
            to_number = call_data.get('to', '')

            # Convert price to positive number (Twilio returns negative for outbound costs)
            try:
                price_float = abs(float(price)) if price else 0.0
            except (ValueError, TypeError):
                price_float = 0.0

            # Convert duration to integer
            try:
                duration_seconds = int(duration) if duration else 0
            except (ValueError, TypeError):
                duration_seconds = 0

            # Calculate per-minute rate
            duration_minutes = duration_seconds / 60.0 if duration_seconds > 0 else 0
            rate_per_minute = price_float / duration_minutes if duration_minutes > 0 else 0

            return {
                "provider": "twilio",
                "call_sid": call_data.get('sid', ''),
                "call_status": status,
                "call_direction": direction,
                "from_number": from_number,
                "to_number": to_number,
                "duration_seconds": duration_seconds,
                "duration_minutes": round(duration_minutes, 4),
                "price_raw": price,
                "price_unit": price_unit,
                "cost_usd": round(price_float, 6),
                "rate_per_minute": round(rate_per_minute, 6),
                "cost_formatted": f"${price_float:.6f}",
                "fetched_at": datetime.utcnow().isoformat() + "Z",
                "data_source": "twilio_api"
            }

        except Exception as e:
            logger.error(f"❌ Error parsing Twilio call data: {e}")
            return {
                "provider": "twilio",
                "error": str(e),
                "cost_usd": 0.0,
                "data_source": "twilio_api_error"
            }

    def _calculate_fallback_cost(
            self, call_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Calculate fallback cost when price field is not available"""
        try:
            duration = call_data.get('duration', '0')
            direction = call_data.get('direction', 'unknown')
            status = call_data.get('status', 'unknown')

            # Convert duration to integer seconds
            try:
                duration_seconds = int(duration) if duration else 0
            except (ValueError, TypeError):
                duration_seconds = 0

            if duration_seconds <= 0 or status != 'completed':
                logger.info(
                    f"⚠️ Cannot calculate cost: duration={duration_seconds}s, status={status}"
                )
                return None

            # Standard Twilio rates (USD per minute) - these are approximate rates
            # Users should check current Twilio pricing for exact rates
            rates = {
                'outbound-api': 0.0497,  # Outbound calls
                'inbound': 0.0085,  # Inbound calls
                'client-outbound': 0.004,  # Client/browser calls
                'sip-outbound': 0.004,  # SIP outbound
                'sip-inbound': 0.0085,  # SIP inbound
            }

            # Default rate if direction not found
            rate_per_minute = rates.get(direction, 0.0497)

            # Calculate cost based on duration (Twilio bills per minute, rounded up)
            duration_minutes = (duration_seconds +
                                59) / 60  # Round up to next minute
            calculated_cost = duration_minutes * rate_per_minute

            logger.info(
                f"💰 Fallback calculation: {duration_seconds}s = {duration_minutes:.2f} min × ${rate_per_minute}/min = ${calculated_cost:.6f}"
            )

            return {
                "provider":
                "twilio",
                "call_sid":
                call_data.get('sid', ''),
                "call_status":
                status,
                "call_direction":
                direction,
                "from_number":
                call_data.get('from', ''),
                "to_number":
                call_data.get('to', ''),
                "duration_seconds":
                duration_seconds,
                "duration_minutes":
                round(duration_minutes, 4),
                "price_raw":
                f"-{calculated_cost:.6f}",  # Negative for outbound costs
                "price_unit":
                "USD",
                "cost_usd":
                round(calculated_cost, 6),
                "rate_per_minute":
                round(rate_per_minute, 6),
                "cost_formatted":
                f"${calculated_cost:.6f}",
                "fetched_at":
                datetime.utcnow().isoformat() + "Z",
                "data_source":
                "calculated_fallback",
                "note":
                f"Calculated using standard rate ${rate_per_minute}/min for {direction} calls"
            }

        except Exception as e:
            logger.error(f"❌ Error calculating fallback cost: {e}")
            return None

    async def find_call_sid_by_phone_numbers(
            self,
            from_phone: str,
            to_phone: str,
            call_start_time: Optional[str] = None) -> Optional[str]:
        """Find Twilio Call SID by matching phone numbers and optionally call start time"""
        if not self.account_sid or not self.auth_token:
            logger.warning(
                "Twilio credentials not configured - cannot search calls")
            return None

        # Build query parameters
        params = {
            'From': from_phone,
            'To': to_phone,
            'PageSize': 20  # Get recent calls to find the match
        }

        # Add date filter if call_start_time provided
        if call_start_time:
            try:
                # Parse the call start time and create a date filter
                start_dt = datetime.fromisoformat(
                    call_start_time.replace('Z', '+00:00'))
                # Search within a window around the start time (±10 minutes)
                start_date = start_dt.strftime('%Y-%m-%d')
                params['StartTime>'] = start_date
                logger.info(
                    f"🔍 Searching for call from {from_phone} to {to_phone} on {start_date}"
                )
            except Exception as e:
                logger.warning(
                    f"Could not parse call start time {call_start_time}: {e}")
                logger.info(
                    f"🔍 Searching for call from {from_phone} to {to_phone} (no time filter)"
                )
        else:
            logger.info(
                f"🔍 Searching for call from {from_phone} to {to_phone}")

        # Build URL with query parameters
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        url = f"{self.base_url}/Calls.json?{query_string}"
        auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, auth=auth) as response:
                    if response.status == 200:
                        data = await response.json()
                        calls = data.get('calls', [])

                        if calls:
                            # Return the most recent matching call
                            most_recent_call = calls[0]
                            call_sid = most_recent_call.get('sid')
                            call_status = most_recent_call.get('status')
                            call_duration = most_recent_call.get('duration')

                            logger.info(
                                f"✅ Found matching call SID: {call_sid} (status: {call_status}, duration: {call_duration}s)"
                            )
                            return call_sid
                        else:
                            logger.warning(
                                f"❌ No calls found matching from:{from_phone} to:{to_phone}"
                            )
                            return None
                    else:
                        logger.error(
                            f"❌ Twilio API error searching calls: {response.status}"
                        )
                        return None
        except Exception as e:
            logger.error(f"❌ Error searching for call: {e}")
            return None

    async def fetch_recent_calls(self,
                                 limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent calls from Twilio account"""
        if not self.account_sid or not self.auth_token:
            logger.warning(
                "Twilio credentials not configured - cannot fetch recent calls"
            )
            return []

        try:
            # Use Twilio REST API with aiohttp instead of sync client
            url = f"{self.base_url}/Calls.json?PageSize={limit}"
            auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)

            async with aiohttp.ClientSession() as session:
                async with session.get(url, auth=auth) as response:
                    if response.status == 200:
                        data = await response.json()
                        calls = data.get('calls', [])
                        return [{
                            "sid": call.get("sid"),
                            "status": call.get("status"),
                            "duration": call.get("duration") or 0,
                            "price": call.get("price"),
                            "start_time": call.get("start_time")
                        } for call in calls]
                    else:
                        logger.error(
                            f"❌ Twilio API error fetching recent calls: {response.status}"
                        )
                        return []
        except Exception as e:
            logger.error(f"❌ Error fetching recent calls: {e}")
            return []


# Global instance
twilio_cost_fetcher = TwilioCostFetcher()
