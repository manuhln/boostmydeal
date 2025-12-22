import { Request, Response } from 'express';

export interface SmallestAIVoice {
  voice_id: string;
  name: string;
  gender: string;
  age: string;
  accent: string;
  tone: string[];
  characteristics: string[];
  language: string;
}

export class SmallestAIService {
  private readonly apiKey: string;
  
  constructor() {
    this.apiKey = process.env.SMALLEST_AI_API_KEY || '';
  }

  private readonly smallestAIVoices: SmallestAIVoice[] = [
    {
      voice_id: 'chirag',
      name: 'Chirag',
      gender: 'Male',
      age: '30s',
      accent: 'Indian',
      tone: ['Indian Tone'],
      characteristics: ['Professional', 'Clear', 'Natural'],
      language: 'en-IN'
    },
    {
      voice_id: 'chirag',
      name: 'Chirag',
      gender: 'Male',
      age: '30s',
      accent: 'Indian',
      tone: ['Indian Tone'],
      characteristics: ['Professional', 'Clear', 'Natural'],
      language: 'hi-IN'
    },
    {
      voice_id: 'albus',
      name: 'Albus',
      gender: 'Male',
      age: '60s',
      accent: 'American',
      tone: ['American Tone', 'Mature'],
      characteristics: ['Wise', 'Old', 'Authoritative'],
      language: 'en-US'
    },
    {
      voice_id: 'albus',
      name: 'Albus',
      gender: 'Male',
      age: '60s',
      accent: 'American',
      tone: ['American Tone', 'Mature'],
      characteristics: ['Wise', 'Old', 'Authoritative'],
      language: 'hi-IN'
    },
    {
      voice_id: 'natasha',
      name: 'Natasha',
      gender: 'Female',
      age: '40s',
      accent: 'American',
      tone: ['American Tone', 'Professional'],
      characteristics: ['Middle-aged', 'Confident', 'Clear'],
      language: 'en-US'
    },
    {
      voice_id: 'natasha',
      name: 'Natasha',
      gender: 'Female',
      age: '40s',
      accent: 'American',
      tone: ['American Tone', 'Professional'],
      characteristics: ['Middle-aged', 'Confident', 'Clear'],
      language: 'hi-IN'
    },
    {
      voice_id: 'vihaan',
      name: 'Vihaan',
      gender: 'Male',
      age: '20s',
      accent: 'Indian',
      tone: ['Indian Tone', 'Youthful'],
      characteristics: ['Young', 'Energetic', 'Modern'],
      language: 'en-IN'
    },
    {
      voice_id: 'vihaan',
      name: 'Vihaan',
      gender: 'Male',
      age: '20s',
      accent: 'Indian',
      tone: ['Indian Tone', 'Youthful'],
      characteristics: ['Young', 'Energetic', 'Modern'],
      language: 'hi-IN'
    },
    {
      voice_id: 'erica',
      name: 'Erica',
      gender: 'Female',
      age: '20s',
      accent: 'American',
      tone: ['American Tone', 'Youthful'],
      characteristics: ['Young', 'Bright', 'Friendly'],
      language: 'en-US'
    },
    {
      voice_id: 'erica',
      name: 'Erica',
      gender: 'Female',
      age: '20s',
      accent: 'American',
      tone: ['American Tone', 'Youthful'],
      characteristics: ['Young', 'Bright', 'Friendly'],
      language: 'hi-IN'
    },
    {
      voice_id: 'tasha',
      name: 'Tasha',
      gender: 'Female',
      age: '40s',
      accent: 'American',
      tone: ['American Tone', 'Professional'],
      characteristics: ['Middle-aged', 'Confident', 'Warm'],
      language: 'en-US'
    },
    {
      voice_id: 'tasha',
      name: 'Tasha',
      gender: 'Female',
      age: '40s',
      accent: 'American',
      tone: ['American Tone', 'Professional'],
      characteristics: ['Middle-aged', 'Confident', 'Warm'],
      language: 'hi-IN'
    },
    {
      voice_id: 'alec',
      name: 'Alec',
      gender: 'Male',
      age: '40s',
      accent: 'Canadian',
      tone: ['Canadian Tone', 'Professional'],
      characteristics: ['Middle-aged', 'Clear', 'Friendly'],
      language: 'en-CA'
    },
    {
      voice_id: 'alec',
      name: 'Alec',
      gender: 'Male',
      age: '40s',
      accent: 'Canadian',
      tone: ['Canadian Tone', 'Professional'],
      characteristics: ['Middle-aged', 'Clear', 'Friendly'],
      language: 'hi-IN'
    },
    {
      voice_id: 'william',
      name: 'William',
      gender: 'Male',
      age: '20s',
      accent: 'Canadian',
      tone: ['Canadian Tone', 'Youthful'],
      characteristics: ['Young', 'Energetic', 'Natural'],
      language: 'en-CA'
    },
    {
      voice_id: 'william',
      name: 'William',
      gender: 'Male',
      age: '20s',
      accent: 'Canadian',
      tone: ['Canadian Tone', 'Youthful'],
      characteristics: ['Young', 'Energetic', 'Natural'],
      language: 'hi-IN'
    }
  ];

  async getVoices(): Promise<SmallestAIVoice[]> {
    try {
      console.log('🎵 [SmallestAI] Fetching available voices...');
      
      const voices = this.smallestAIVoices.map(voice => ({
        ...voice,
        provider: 'SmallestAI'
      }));

      console.log(`🎵 [SmallestAI] Successfully fetched ${voices.length} voices`);
      return voices;
    } catch (error) {
      console.error('❌ [SmallestAI] Error fetching voices:', error);
      throw new Error('Failed to fetch Smallest AI voices');
    }
  }

  async handleGetVoices(req: Request, res: Response): Promise<void> {
    try {
      const { name, gender, country, accent, language } = req.query;
      
      let voices = await this.getVoices();
      
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
          
          switch (language.toLowerCase()) {
            case 'en':
            case 'english':
              return voiceLang.startsWith('en-') || 
                     voiceLang === 'en' || 
                     voiceLang === 'english';
            case 'hi':
            case 'hindi':
              return voiceLang.startsWith('hi-') || 
                     voiceLang === 'hi' || 
                     voiceLang === 'hindi';
            default:
              return voiceLang.includes(language.toLowerCase());
          }
        });
      }

      console.log(`🎵 [SmallestAI] Applied filters, returning ${voices.length} voices`);
      
      res.status(200).json({
        success: true,
        data: voices,
        message: 'Smallest AI voices retrieved successfully'
      });
    } catch (error) {
      console.error('❌ [SmallestAI] Route error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const voices = await this.getVoices();
      return voices.length > 0;
    } catch (error) {
      console.error('❌ [SmallestAI] Config validation failed:', error);
      return false;
    }
  }
}
