export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples?: any[];
  category?: string;
  fine_tuning?: any;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: any;
  sharing?: any;
  high_quality_base_model_ids?: string[];
  safety_control?: any;
  voice_verification?: any;
  permissions?: any;
  owner_id?: string;
  is_legacy?: boolean;
  is_mixed?: boolean;
  // Enhanced personality traits
  personality?: {
    gender: string;
    age: string;
    accent: string;
    tone: string[];
    characteristics: string[];
  };
}

export interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";

  // Enhanced personality mapping for popular ElevenLabs voices
  private readonly voicePersonalities: Record<
    string,
    {
      gender: string;
      age: string;
      accent: string;
      tone: string[];
      characteristics: string[];
    }
  > = {
    pNInz6obpgDQGcFmaJgB: {
      // Adam
      gender: "Male",
      age: "30s",
      accent: "American",
      tone: ["Deep", "Authoritative"],
      characteristics: ["Professional", "Confident", "Narrator"],
    },
    EXAVITQu4vr4xnSDxMaL: {
      // Bella
      gender: "Female",
      age: "20s",
      accent: "American",
      tone: ["Warm", "Friendly"],
      characteristics: ["Engaging", "Natural", "Cheerful"],
    },
    VR6AewLTigWG4xSOukaG: {
      // Arnold
      gender: "Male",
      age: "40s",
      accent: "American",
      tone: ["Strong", "Commanding"],
      characteristics: ["Powerful", "Assertive", "Bold"],
    },
    ErXwobaYiN019PkySvjV: {
      // Antoni
      gender: "Male",
      age: "30s",
      accent: "American",
      tone: ["Clear", "Articulate"],
      characteristics: ["Well-spoken", "Intelligent", "Polished"],
    },
    MF3mGyEYCl7XYWbV9V6O: {
      // Elli
      gender: "Female",
      age: "20s",
      accent: "American",
      tone: ["Youthful", "Energetic"],
      characteristics: ["Bright", "Enthusiastic", "Modern"],
    },
    TxGEqnHWrfWFTfGW9XjX: {
      // Josh
      gender: "Male",
      age: "20s",
      accent: "American",
      tone: ["Casual", "Relaxed"],
      characteristics: ["Conversational", "Easy-going", "Friendly"],
    },
    AZnzlk1XvdvUeBnXmlld: {
      // Domi
      gender: "Female",
      age: "30s",
      accent: "American",
      tone: ["Strong", "Confident"],
      characteristics: ["Assertive", "Professional", "Direct"],
    },
    BjEROETieA12i9gT25f7: {
      // Alma
      gender: "Female",
      age: "30s",
      accent: "American",
      tone: ["Strong", "Confident"],
      characteristics: ["Assertive", "Professional", "Direct"],
    },
    GBv7mTt0atIp3Br8iCZE: {
      // Thomas
      gender: "Male",
      age: "40s",
      accent: "American",
      tone: ["Mature", "Calm"],
      characteristics: ["Experienced", "Thoughtful", "Reliable"],
    },
    onwK4e9ZLuTAKqWW03F9: {
      // Daniel
      gender: "Male",
      age: "30s",
      accent: "British",
      tone: ["Sophisticated", "Clear"],
      characteristics: ["Refined", "Articulate", "Educated"],
    },
    CYw3kZ02Hs0563khs1Fj: {
      // Gigi
      gender: "Female",
      age: "20s",
      accent: "American",
      tone: ["Playful", "Light"],
      characteristics: ["Fun", "Cheerful", "Upbeat"],
    },
    XB0fDUnXU5powFXDhCwa: {
      // Charlotte
      gender: "Female",
      age: "30s",
      accent: "British",
      tone: ["Elegant", "Sophisticated"],
      characteristics: ["Refined", "Professional", "Cultured"],
    },
    IKne3meq5aSn9XLyUdCD: {
      // Charlie
      gender: "Male",
      age: "20s",
      accent: "Australian",
      tone: ["Casual", "Friendly"],
      characteristics: ["Laid-back", "Approachable", "Natural"],
    },
    nPczCjzI2devNBz1zQrb: {
      // Brian
      gender: "Male",
      age: "40s",
      accent: "American",
      tone: ["Authoritative", "Professional"],
      characteristics: ["Corporate", "Trustworthy", "Experienced"],
    },
    N2lVS1w4EtoT3dr4eOWO: {
      // Callum
      gender: "Male",
      age: "30s",
      accent: "British",
      tone: ["Calm", "Measured"],
      characteristics: ["Thoughtful", "Intelligent", "Composed"],
    },
    "21m00Tcm4TlvDq8ikWAM": {
      // Rachel
      gender: "Female",
      age: "30s",
      accent: "American",
      tone: ["Warm", "Professional"],
      characteristics: ["Trustworthy", "Reliable", "Corporate"],
    },
    UgBBYS2sOqTuMpoF3BR0: {
      // Mark
      gender: "Male",
      age: "30s",
      accent: "American",
      tone: ["Clear", "Natural"],
      characteristics: ["Professional", "Articulate", "Reliable"],
    },
    NOpBlnGInO9m6vDvFkFC: {
      // Spuds Grandpa Oxley
      gender: "Male",
      age: "60s",
      accent: "American",
      tone: ["Grandfatherly", "Wise"],
      characteristics: ["Experienced", "Character Voice", "Storytelling"],
    },
    "56AoDkrOh6qfVPDXZ7Pt": {
      // Cassidy
      gender: "Female",
      age: "20s",
      accent: "American",
      tone: ["Youthful", "Energetic"],
      characteristics: ["Fresh", "Modern", "Engaging"],
    },
    aMSt68OGf4xUZAnLpTU8: {
      // Juniper
      gender: "Female",
      age: "30s",
      accent: "American",
      tone: ["Natural", "Calm"],
      characteristics: ["Soothing", "Professional", "Clear"],
    },
    kdmDKE6EkgrWrrykO9Qt: {
      // Alexandra
      gender: "Female",
      age: "30s",
      accent: "American",
      tone: ["Professional", "Clear"],
      characteristics: ["Corporate", "Authoritative", "Polished"],
    },
    TRnaQb7q41oL7sV0w6Bu: {
      // Simran
      gender: "Female",
      age: "20s",
      accent: "Multilingual",
      tone: ["Warm", "Multilingual"],
      characteristics: ["Spanish", "Hindi", "International"],
    },
    iWNf11sz1GrUE4ppxTOL: {
      // Viraj
      gender: "Male",
      age: "30s",
      accent: "Multilingual",
      tone: ["Clear", "Multilingual"],
      characteristics: ["Hindi", "Spanish", "International"],
    },
    IPgYtHTNLjC7Bq7IPHrm: {
      // Alxendra
      gender: "Female",
      age: "20s",
      accent: "Multilingual",
      tone: ["Clear", "Informative"],
      characteristics: ["Hindi", "Spanish", "French", "Conversational"],
    },
    gCux0vt1cPsEXPNSbchu: {
      // Anna
      gender: "Female",
      age: "30s",
      accent: "French",
      tone: ["Professional", "Narrative"],
      characteristics: ["French", "Standard", "Story-telling"],
    },
  };

  constructor() {
    // Use API key from environment variable
    this.apiKey = process.env.ELEVENLABS_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "⚠️ [ElevenLabs] No API key found in environment variable ELEVENLABS_API_KEY",
      );
    }
  }

  /**
   * Get manually provided voices (API fetching commented out per user request)
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      // COMMENTED OUT: API voice fetching as requested by user
      // Only show manually provided voices and cloned voices
      /*
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const data: ElevenLabsVoicesResponse = await response.json();
      
      // Enhance voices with personality information
      const enhancedVoices = data.voices.map(voice => ({
        ...voice,
        personality: this.voicePersonalities[voice.voice_id] || {
          gender: 'Unknown',
          age: 'Adult',
          accent: 'Neutral',
          tone: ['Natural'],
          characteristics: ['Standard']
        }
      }));
      */

      // Return only manually provided voices with embedded personality data
      const manualVoices: ElevenLabsVoice[] = [
        {
          voice_id: "zgqefOY5FPQ3bB7OZTVR",
          name: "Mark",
          category: "premade",
          description: "Young Adult speaking in Natual manner",
          personality: {
            gender: "Male",
            age: "20s",
            accent: "American",
            tone: ["Deep", "Casual"],
            characteristics: [
              "Hindi",
              "German",
              "Spanish",
              "Russian",
              "French",
              "English",
              "International",
            ],
          },
        },
        {
          voice_id: "56AoDkrOh6qfVPDXZ7Pt",
          name: "Cassidy",
          category: "premade",
          description: "Young Female Adult speaking",
          personality: {
            gender: "Female",
            age: "20s",
            accent: "American",
            tone: ["Deep", "Casual", "Fun"],
            characteristics: ["Hindi", "English"],
          },
        },
        {
          voice_id: "zT03pEAEi0VHKciJODfn",
          name: "Raju",
          category: "premade",
          description: "Young Indian speaking in Natual manner",
          personality: {
            gender: "Male",
            age: "20s",
            accent: "Indian",
            tone: ["Professional", "Versatile"],
            characteristics: ["Hindi", "French"],
          },
        },
        {
          voice_id: "1qEiC6qsybMkmnNdVMbL",
          name: "Niraj",
          category: "premade",
          description:
            "Deep, authoritative male voice perfect for conversation",
          personality: {
            gender: "Male",
            age: "30s",
            accent: "Indian",
            tone: ["Deep", "Authoritative"],
            characteristics: [
              "Hindi",
              "German",
              "Spanish",
              "Russian",
              "French",
              "English",
            ],
          },
        },
        {
          voice_id: "goT3UYdM9bhm0n2lmKQx",
          name: "Edward",
          category: "premade",
          description:
            "Deep, authoritative male voice perfect for conversation",
          personality: {
            gender: "Male",
            age: "20s",
            accent: "British",
            tone: ["Deep", "Authoritative"],
            characteristics: ["English", "Spanish"],
          },
        },
        {
          voice_id: "2qEiC6qsybMkmnNdVMbM",
          name: "David",
          category: "premade",
          description: "Confident, male voice perfect for narration",
          personality: {
            gender: "Male",
            age: "30s",
            accent: "Spanish",
            tone: ["Narration", "Confident"],
            characteristics: ["Hindi", "Spanish", "French"],
          },
        },

        {
          voice_id: "BjEROETieA12i9gT25f7",
          name: "Alma Hayek",
          category: "premade",
          description:
            "Confident, female voice perfect for narration in cuba region",
          personality: {
            gender: "Female",
            age: "30s",
            accent: "Spanish",
            tone: ["Narration", "Confident"],
            characteristics: ["Spanish"],
          },
        },

        {
          voice_id: "PZtZojCZtpekdYsf7TAr",
          name: "Paloma S",
          category: "premade",
          description:
            "Confident, female voice perfect for narration in Latin American region",
          personality: {
            gender: "Female",
            age: "30s",
            accent: "American",
            tone: ["Narration", "Confident"],
            characteristics: ["Spanish"],
          },
        },

        {
          voice_id: "2dxaXwaYxEEIDjoHj0V4",
          name: "Leo",
          category: "premade",
          description: "Middle Aged Man with gentle tone for French",
          personality: {
            gender: "Male",
            age: "30s",
            accent: "Quebec",
            tone: ["Narration", "Confident"],
            characteristics: ["French", "Spanish", "Hindi"],
          },
        },

        {
          voice_id: "IPgYtHTNLjC7Bq7IPHrm",
          name: "Alexandra Boutin",
          category: "premade",
          description: "French Canadian",
          personality: {
            gender: "Male",
            age: "30s",
            accent: "Quebec",
            tone: ["Narration", "Confident"],
            characteristics: ["French", "Spanish", "Hindi", "English"],
          },
        },
        {
          voice_id: "6pccwT1F6VJ5KMrxQqcX",
          name: "Abdel",
          category: "premade",
          description: "French",
          personality: {
            gender: "Male",
            age: "40s",
            accent: "Standard",
            tone: ["Narration", "Confident"],
            characteristics: ["French"],
          },
        },

        {
          voice_id: "3qEiC6qsybMkmnNdVMbN",
          name: "Monika",
          category: "premade",
          description:
            "Deep, authoritative Female voice perfect for professional narration",
          personality: {
            gender: "Female",
            age: "30s",
            accent: "Indian",
            tone: ["Deep", "Authoritative"],
            characteristics: ["Hindi", "French"],
          },
        },
        {
          voice_id: "xoV6iGVuOGYHLWjXhVC7",
          name: "Muskan",
          category: "premade",
          description: "Natural and feels Relatable",
          personality: {
            gender: "Female",
            age: "30s",
            accent: "Indian",
            tone: ["Deep", "Calm"],
            characteristics: ["Hindi", "French", "Spanish"],
          },
        },

        {
          voice_id: "TRnaQb7q41oL7sV0w6Bu",
          name: "Simran",
          category: "premade",
          description:
            "Warm multilingual female voice supporting Spanish and Hindi",
          personality: {
            gender: "Female",
            age: "20s",
            accent: "Multilingual",
            tone: ["Warm", "Multilingual"],
            characteristics: ["Spanish", "Hindi", "International"],
          },
        },
        {
          voice_id: "iWNf11sz1GrUE4ppxTOL",
          name: "Viraj",
          category: "premade",
          description:
            "Clear multilingual male voice supporting Hindi and Spanish",
          personality: {
            gender: "Male",
            age: "30s",
            accent: "Multilingual",
            tone: ["Clear", "Multilingual"],
            characteristics: ["Hindi", "Spanish", "International"],
          },
        },
        {
          voice_id: "IPgYtHTNLjC7Bq7IPHrm",
          name: "Alxendra",
          category: "premade",
          description:
            "Clear, informative multilingual voice supporting Hindi, Spanish, and French",
          personality: {
            gender: "Female",
            age: "20s",
            accent: "Multilingual",
            tone: ["Clear", "Informative"],
            characteristics: ["Hindi", "Spanish", "French", "Conversational"],
          },
        },
        {
          voice_id: "gCux0vt1cPsEXPNSbchu",
          name: "Anna",
          category: "premade",
          description: "Professional French narrator with standard accent",
          personality: {
            gender: "Female",
            age: "30s",
            accent: "French",
            tone: ["Professional", "Narrative"],
            characteristics: ["French"],
          },
        },
      ];

      return manualVoices;
    } catch (error) {
      console.error("Failed to get manual voices:", error);
      throw new Error("Failed to get manual voices");
    }
  }

  /**
   * Get all voices including cloned voices from integrations
   */
  async getAllVoicesIncludingCloned(
    userId?: string,
    organizationId?: string,
  ): Promise<ElevenLabsVoice[]> {
    try {
      // Get standard ElevenLabs voices
      const standardVoices = await this.getVoices();

      // If user context is provided, get cloned voices from integrations
      if (userId && organizationId) {
        try {
          const { IntegrationConfig } = await import(
            "../integrations/common/integration-config.model"
          );

          const elevenLabsIntegrations = await IntegrationConfig.find({
            userId,
            organizationId,
            type: "ELEVENLABS",
            isActive: true,
          });

          // Extract cloned voices from all ElevenLabs integrations
          const clonedVoices: ElevenLabsVoice[] = [];
          for (const integration of elevenLabsIntegrations) {
            const config =
              typeof integration.config === "string"
                ? JSON.parse(integration.config)
                : integration.config;
            const clonedVoicesData = config?.clonedVoices || [];
            clonedVoicesData.forEach((voice: any) => {
              clonedVoices.push({
                voice_id: voice.voice_id,
                name: `🎙️ ${voice.name}`, // Add emoji to distinguish cloned voices
                category: "cloned",
                description: voice.description || "Custom cloned voice",
                personality: {
                  gender: "Custom",
                  age: "Adult",
                  accent: "Custom",
                  tone: ["Cloned"],
                  characteristics: ["Custom Voice", "Cloned"],
                },
              });
            });
          }

          return [...standardVoices, ...clonedVoices];
        } catch (error) {
          console.error("Failed to fetch cloned voices:", error);
          return standardVoices; // Return standard voices if cloned fetch fails
        }
      }

      return standardVoices;
    } catch (error) {
      console.error("Failed to fetch voices with cloned:", error);
      throw new Error("Failed to fetch voices from ElevenLabs");
    }
  }

  /**
   * Get a specific voice by ID
   */
  async getVoiceById(voiceId: string): Promise<ElevenLabsVoice | null> {
    try {
      const voices = await this.getVoices();
      return voices.find((voice) => voice.voice_id === voiceId) || null;
    } catch (error) {
      console.error("Failed to fetch voice by ID:", error);
      return null;
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
