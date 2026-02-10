interface CreateSIPTrunkConfig {
  phoneNumber: string;
  voxsunUsername: string;
  voxsunPassword: string;
  voxsunDomain: string;
  voxsunPort: number;
}

interface CreateSIPTrunkResponse {
  status: string;
  sip_trunk_id: string;
  message: string;
  trunk_name: string;
  registered_number: string;
  sip_address: string;
}

/**
 * VoxsunTrunkCreator - Creates LiveKit SIP trunks via FastAPI endpoint
 * 
 * This utility makes HTTP requests to the livekitserver FastAPI app
 * to create SIP trunks for Voxsun configuration, instead of spawning
 * a subprocess. This is cleaner and more maintainable.
 */
export class VoxsunTrunkCreator {
  private static readonly LIVEKIT_SERVER_URL = process.env.LIVEKIT_SERVER_URL || 'http://localhost:5000';
  private static readonly LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';

  /**
   * Create a Voxsun SIP trunk in LiveKit by calling the FastAPI endpoint
   * 
   * Environment Variables Required:
   * - LIVEKIT_SERVER_URL: Base URL of the livekitserver (default: http://localhost:5000)
   * - LIVEKIT_API_KEY: API key for authentication with livekitserver
   * 
   * @param config - The Voxsun SIP trunk configuration
   * @returns The LiveKit SIP trunk ID, or null if creation fails
   */
  static async createLiveKitSIPTrunk(config: CreateSIPTrunkConfig): Promise<string | null> {
    try {
      console.log(`🔧 [VoxsunTrunkCreator] Creating LiveKit SIP trunk for: ${config.phoneNumber}`);
      console.log(`   Domain: ${config.voxsunDomain}:${config.voxsunPort}`);
      console.log(`   Username: ${config.voxsunUsername}`);
      
      if (!this.LIVEKIT_API_KEY) {
        console.warn('[VoxsunTrunkCreator] ⚠️ LIVEKIT_API_KEY not set. SIP trunk creation may fail.');
      }

      const payload = {
        phone_number: config.phoneNumber,
        voxsun_username: config.voxsunUsername,
        voxsun_password: config.voxsunPassword,
        voxsun_domain: config.voxsunDomain,
        voxsun_port: config.voxsunPort,
      };

      console.log(`📤 [VoxsunTrunkCreator] Sending payload to ${this.LIVEKIT_SERVER_URL}/create_sip_trunk`);
      console.log(`   Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(
        `${this.LIVEKIT_SERVER_URL}/create_sip_trunk`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': this.LIVEKIT_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as any)?.detail?.message || (errorData as any)?.message || response.statusText;
        
        console.error(`❌ [VoxsunTrunkCreator] HTTP ${response.status}: ${errorMessage}`);
        
        if (response.status === 401) {
          console.error('[VoxsunTrunkCreator] Authentication failed. Check LIVEKIT_API_KEY.');
        } else if (response.status === 404) {
          console.error('[VoxsunTrunkCreator] LiveKit server not found. Check LIVEKIT_SERVER_URL.');
        }
        
        return null;
      }

      const data = (await response.json()) as CreateSIPTrunkResponse;

      if (data.status === 'success' && data.sip_trunk_id) {
        console.log(`✅ [VoxsunTrunkCreator] SIP trunk created successfully!`);
        console.log(`   Trunk ID: ${data.sip_trunk_id}`);
        console.log(`   SIP Address: ${data.sip_address}`);
        console.log(`   Registered Number: ${data.registered_number}`);
        return data.sip_trunk_id;
      } else {
        console.error(`❌ [VoxsunTrunkCreator] Unexpected response status: ${data.status}`);
        return null;
      }
    } catch (error) {
      console.error(
        `❌ [VoxsunTrunkCreator] Failed to create SIP trunk: ${error instanceof Error ? error.message : String(error)}`
      );
      
      // Non-blocking: return null instead of throwing
      return null;
    }
  }
}
