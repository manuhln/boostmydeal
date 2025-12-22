import { Router } from 'express';
import { elevenLabsService } from '../services/ElevenLabsService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/elevenlabs/voices
 * Fetch all available voices from ElevenLabs
 */
router.get('/voices', authMiddleware, async (req, res) => {
  try {
    console.log('🎵 [ElevenLabs] Fetching available voices...');
    
    // Extract query parameters for filtering
    const { name, gender, country, accent, language } = req.query;
    
    // Get user context for cloned voices
    const userId = (req as any).user ? (req as any).user._id.toString() : undefined;
    const organizationId = (req as any).organization ? (req as any).organization._id.toString() : undefined;
    
    const voices = await elevenLabsService.getAllVoicesIncludingCloned(userId, organizationId);
    
    console.log(`🎵 [ElevenLabs] Successfully fetched ${voices.length} voices`);
    
    // Format voices for frontend consumption
    let formattedVoices = voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      preview_url: voice.preview_url,
      labels: voice.labels,
      personality: voice.personality, // Include personality information
    }));

    // Apply filters if provided
    if (name && typeof name === 'string') {
      formattedVoices = formattedVoices.filter(voice => 
        voice.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (gender && typeof gender === 'string') {
      formattedVoices = formattedVoices.filter(voice => 
        voice.personality?.gender?.toLowerCase() === gender.toLowerCase()
      );
    }

    if (country && typeof country === 'string') {
      formattedVoices = formattedVoices.filter(voice => 
        voice.personality?.accent?.toLowerCase().includes(country.toLowerCase())
      );
    }

    if (accent && typeof accent === 'string') {
      formattedVoices = formattedVoices.filter(voice => 
        voice.personality?.accent?.toLowerCase().includes(accent.toLowerCase())
      );
    }

    if (language && typeof language === 'string') {
      // Filter voices based on language characteristics
      // Show voices that support the selected language or are marked as "International"
      const languageMap: Record<string, string[]> = {
        'en': ['English', 'International'],
        'english': ['English', 'International'],
        'es': ['Spanish', 'International'],
        'spanish': ['Spanish', 'International'],
        'hi': ['Hindi', 'International'],
        'hindi': ['Hindi', 'International'],
        'fr': ['French', 'International'],
        'french': ['French', 'International']
      };

      const targetLanguages = languageMap[language.toLowerCase()];
      if (targetLanguages) {
        formattedVoices = formattedVoices.filter(voice => 
          voice.personality?.characteristics?.some(char => 
            targetLanguages.some(targetLang => 
              char.toLowerCase() === targetLang.toLowerCase()
            )
          )
        );
      }
    }

    console.log(`🎵 [ElevenLabs] Applied filters, returning ${formattedVoices.length} voices`);

    res.json({
      success: true,
      data: formattedVoices,
    });
  } catch (error) {
    console.error('❌ [ElevenLabs] Error fetching voices:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch voices',
    });
  }
});

/**
 * GET /api/elevenlabs/voices/:voiceId
 * Get specific voice details by ID
 */
router.get('/voices/:voiceId', authMiddleware, async (req, res) => {
  try {
    const { voiceId } = req.params;
    console.log(`🎵 [ElevenLabs] Fetching voice details for ID: ${voiceId}`);
    
    const voice = await elevenLabsService.getVoiceById(voiceId);
    
    if (!voice) {
      return res.status(404).json({
        success: false,
        message: 'Voice not found',
      });
    }

    res.json({
      success: true,
      data: voice,
    });
  } catch (error) {
    console.error('❌ [ElevenLabs] Error fetching voice by ID:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch voice',
    });
  }
});

export default router;