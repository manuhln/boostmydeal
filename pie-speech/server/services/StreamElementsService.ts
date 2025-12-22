import { Request, Response } from 'express';

export interface StreamElementsVoice {
  voice_id: string;
  name: string;
  gender: string;
  age: string;
  accent: string;
  tone: string[];
  characteristics: string[];
  language: string;
}

export class StreamElementsService {
  private readonly apiKey: string;
  
  constructor() {
    this.apiKey = process.env.STREAMELEMENTS_API_KEY || '';
  }

  // Stream Elements voices with personality information
  private readonly streamElementsVoices: StreamElementsVoice[] = [
    {
      voice_id: 'brian',
      name: 'Brian',
      gender: 'Male',
      age: '30s',
      accent: 'British',
      tone: ['Clear', 'Professional'],
      characteristics: ['Authoritative', 'News Anchor', 'Formal'],
      language: 'en-GB'
    },
    {
      voice_id: 'amy',
      name: 'Amy',
      gender: 'Female',
      age: '30s',
      accent: 'British',
      tone: ['Soft', 'Pleasant'],
      characteristics: ['Friendly', 'Conversational', 'Warm'],
      language: 'en-GB'
    },
    {
      voice_id: 'emma',
      name: 'Emma',
      gender: 'Female',
      age: '20s',
      accent: 'British',
      tone: ['Refined', 'Elegant'],
      characteristics: ['Sophisticated', 'Cultured', 'Professional'],
      language: 'en-GB'
    },
    {
      voice_id: 'geraint',
      name: 'Geraint',
      gender: 'Male',
      age: '40s',
      accent: 'Welsh',
      tone: ['Deep', 'Resonant'],
      characteristics: ['Distinguished', 'Mature', 'Storyteller'],
      language: 'en-GB'
    },
    {
      voice_id: 'russell',
      name: 'Russell',
      gender: 'Male',
      age: '30s',
      accent: 'Australian',
      tone: ['Casual', 'Friendly'],
      characteristics: ['Relaxed', 'Easy-going', 'Approachable'],
      language: 'en-AU'
    },
    {
      voice_id: 'nicole',
      name: 'Nicole',
      gender: 'Female',
      age: '30s',
      accent: 'Australian',
      tone: ['Clear', 'Confident'],
      characteristics: ['Professional', 'Articulate', 'Direct'],
      language: 'en-AU'
    },
    {
      voice_id: 'joey',
      name: 'Joey',
      gender: 'Male',
      age: '20s',
      accent: 'American',
      tone: ['Youthful', 'Energetic'],
      characteristics: ['Enthusiastic', 'Modern', 'Dynamic'],
      language: 'en-US'
    },
    {
      voice_id: 'justin',
      name: 'Justin',
      gender: 'Male',
      age: '20s',
      accent: 'American',
      tone: ['Casual', 'Conversational'],
      characteristics: ['Friendly', 'Approachable', 'Natural'],
      language: 'en-US'
    },
    {
      voice_id: 'matthew',
      name: 'Matthew',
      gender: 'Male',
      age: '30s',
      accent: 'American',
      tone: ['Authoritative', 'Clear'],
      characteristics: ['Professional', 'Confident', 'Business'],
      language: 'en-US'
    },
    {
      voice_id: 'joanna',
      name: 'Joanna',
      gender: 'Female',
      age: '30s',
      accent: 'American',
      tone: ['Warm', 'Professional'],
      characteristics: ['Trustworthy', 'Reliable', 'Newsreader'],
      language: 'en-US'
    },
    {
      voice_id: 'kendra',
      name: 'Kendra',
      gender: 'Female',
      age: '20s',
      accent: 'American',
      tone: ['Bright', 'Cheerful'],
      characteristics: ['Upbeat', 'Positive', 'Engaging'],
      language: 'en-US'
    },
    {
      voice_id: 'kimberly',
      name: 'Kimberly',
      gender: 'Female',
      age: '20s',
      accent: 'American',
      tone: ['Sweet', 'Gentle'],
      characteristics: ['Caring', 'Soft-spoken', 'Nurturing'],
      language: 'en-US'
    },
    {
      voice_id: 'salli',
      name: 'Salli',
      gender: 'Female',
      age: '30s',
      accent: 'American',
      tone: ['Professional', 'Clear'],
      characteristics: ['Articulate', 'Business', 'Polished'],
      language: 'en-US'
    },
    {
      voice_id: 'ivy',
      name: 'Ivy',
      gender: 'Female',
      age: '20s',
      accent: 'American',
      tone: ['Youthful', 'Friendly'],
      characteristics: ['Conversational', 'Modern', 'Casual'],
      language: 'en-US'
    }
  ];

  /**
   * Get all available Stream Elements voices
   */
  async getVoices(): Promise<StreamElementsVoice[]> {
    try {
      console.log('🎵 [StreamElements] Fetching available voices...');
      
      // Return static voice list with personality information
      const voices = this.streamElementsVoices.map(voice => ({
        ...voice,
        provider: 'StreamElements'
      }));

      console.log(`🎵 [StreamElements] Successfully fetched ${voices.length} voices`);
      return voices;
    } catch (error) {
      console.error('❌ [StreamElements] Error fetching voices:', error);
      throw new Error('Failed to fetch Stream Elements voices');
    }
  }

  /**
   * Express route handler for getting Stream Elements voices
   * GET /api/streamelements/voices
   */
  async handleGetVoices(req: Request, res: Response): Promise<void> {
    try {
      // Extract query parameters for filtering
      const { name, gender, country, accent, language } = req.query;
      
      let voices = await this.getVoices();
      
      // Apply filters if provided
      if (name && typeof name === 'string') {
        voices = voices.filter(voice => 
          voice.name.toLowerCase().includes(name.toLowerCase())
        );
      }

      if (gender && typeof gender === 'string') {
        voices = voices.filter(voice => 
          voice.gender?.toLowerCase() === gender.toLowerCase()
        );
      }

      if (country && typeof country === 'string') {
        voices = voices.filter(voice => 
          voice.accent?.toLowerCase().includes(country.toLowerCase()) ||
          voice.language?.toLowerCase().includes(country.toLowerCase())
        );
      }

      if (accent && typeof accent === 'string') {
        voices = voices.filter(voice => 
          voice.accent?.toLowerCase().includes(accent.toLowerCase())
        );
      }

      if (language && typeof language === 'string') {
        voices = voices.filter(voice => {
          if (!voice.language) return false;
          
          const voiceLang = voice.language.toLowerCase();
          
          // Map frontend language codes to voice language patterns
          switch (language.toLowerCase()) {
            case 'en':
            case 'english':
              return voiceLang.startsWith('en-') || 
                     voiceLang === 'en' || 
                     voiceLang === 'english';
            case 'es':
            case 'spanish':
              return voiceLang.startsWith('es-') || 
                     voiceLang === 'es' || 
                     voiceLang === 'spanish';
            case 'fr':
            case 'french':
              return voiceLang.startsWith('fr-') || 
                     voiceLang === 'fr' || 
                     voiceLang === 'french';
            case 'de':
            case 'german':
              return voiceLang.startsWith('de-') || 
                     voiceLang === 'de' || 
                     voiceLang === 'german';
            default:
              return voiceLang.includes(language.toLowerCase());
          }
        });
      }

      console.log(`🎵 [StreamElements] Applied filters, returning ${voices.length} voices`);
      
      res.status(200).json({
        success: true,
        data: voices,
        message: 'Stream Elements voices retrieved successfully'
      });
    } catch (error) {
      console.error('❌ [StreamElements] Route error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Validate Stream Elements API configuration
   */
  async validateConfig(): Promise<boolean> {
    try {
      // For now, just check if we can return voices
      // In a real implementation, this would test API connectivity
      const voices = await this.getVoices();
      return voices.length > 0;
    } catch (error) {
      console.error('❌ [StreamElements] Config validation failed:', error);
      return false;
    }
  }
}