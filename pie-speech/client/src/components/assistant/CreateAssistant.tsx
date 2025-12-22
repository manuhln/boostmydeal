import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useElevenLabsVoices, type VoiceFilters as ElevenLabsVoiceFilters } from "@/hooks/useElevenLabsVoices";
import { useStreamElementsVoices, type VoiceFilters as StreamElementsVoiceFilters } from "@/hooks/useStreamElementsVoices";
// Using any for now since MongoDB model differs from Drizzle schema
// TODO: Align MongoDB model with Drizzle schema or create separate types
import { Upload, Info, FileText, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KnowledgeBaseSelector } from "@/components/KnowledgeBaseSelector";

interface CreateAssistantProps {
  providers: any[];
  selectedAssistant: any; // Using any for now due to schema mismatch
  onAssistantChange: (agent: any) => void;
}

export default function CreateAssistant({ 
  providers, 
  selectedAssistant, 
  onAssistantChange 
}: CreateAssistantProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch phone numbers
  const { data: phoneNumbersData } = useQuery({
    queryKey: ["/api/phone-numbers"],
  }) as { data?: { data?: { phoneNumbers?: any[] } } };

  const phoneNumbers = phoneNumbersData?.data?.phoneNumbers || [];

  // Fetch workflows
  const { data: workflowsData } = useQuery({
    queryKey: ["/api/workflows"],
  }) as { data?: { data?: any[] } };

  const workflows = workflowsData?.data || [];

  // Voice filtering state - defined early to avoid reference errors
  const [voiceFilters, setVoiceFilters] = useState<{
    name: string;
    gender: string;
    country: string;
  }>({
    name: '',
    gender: 'any',
    country: 'any',
  });

  // Filter visibility state
  const [showFilters, setShowFilters] = useState(false);

  // Form state mapping to backend fields - defined after voice filters
  const [formData, setFormData] = useState({
    // Basics Tab - Maps to backend fields
    name: "",
    description: "", // description -> description
    voiceProvider: "ElevenLabs", // voiceProvider -> voiceProvider
    voice: "", // voice -> voice (Voice ID) - will be set when voices load
    transcriber: "Deepgram", // transcriber provider
    transcriberVoiceId: "", // voice ID for transcriber
    phoneNumberId: "none", // phoneNumberId -> phoneNumberId
    // Persona Tab
    modelProvider: "ChatGPT", // model provider
    aiModel: "gpt-4o-mini", // model type -> aiModel (fixed to gpt-4o-mini)
    firstMessage: "", // firstMessage -> firstMessage
    userSpeaksFirst: false, // userSpeaksFirst -> userSpeaksFirst
    systemPrompt: "", // systemPrompt -> systemPrompt (generated from 5 fields)
    identity: "", // identity field for persona
    style: "", // style field for persona
    goals: "", // goals field for persona
    responseGuidelines: "", // response guidelines field for persona
    errorHandling: "", // error handling field for persona
    // Model & Knowledge Tab (keep existing)
    language: "en", // language -> languages (array)
    voiceModel: "rime", // speechAvatar -> voiceModel
    gender: "neutral", // gender -> gender
    knowledgeBase: [], // knowledgeBase -> knowledgeBase (array)
    ragResponse: "", // RAG response from uploaded PDFs
    trigger: "TRANSCRIPT", // trigger -> trigger
    postWorkflow: "none", // postWorkflow -> postWorkflow
    workflowIds: [] as string[], // workflowIds -> workflowIds (array)
    // Settings Tab (reduced)
    maxTokens: 150, // tokens -> maxTokens
    temperature: 0.7, // temperature -> temperature
    speed: 1.0, // speed -> speed
    // Call settings
    callRecording: true, // callRecording -> callRecording
    callRecordingFormat: "mp3", // callRecordingFormat -> callRecordingFormat
    backgroundAmbientSound: "", // backgroundAmbientSound -> backgroundAmbientSound
    rememberLeadPreference: true, // rememberLeadPreference -> rememberLeadPreference
    voicemailDetection: true, // voicemailDetection -> voicemailDetection
    voicemailMessage: "Hi there! We tried reaching you but couldn't connect, so we're leaving a quick message. This is Sarah calling on behalf of [Your Company]. Just wanted to follow up on your recent interest. Feel free to call us back at your convenience or check your email for more info. Looking forward to speaking with you soon!", // voicemailMessage -> voicemailMessage
    // Call transfer settings
    enableCallTransfer: false, // enableCallTransfer -> enableCallTransfer
    transferPhoneNumber: "", // transferPhoneNumber -> transferPhoneNumber
    // Post Call Analysis Tab
    userTags: [] as string[], // userTags -> userTags (array)
    systemTags: [] as string[], // systemTags -> systemTags (array)
  });

  // Knowledge Base selection state
  const [selectedKnowledgeBaseItems, setSelectedKnowledgeBaseItems] = useState<string[]>([]);

  // User Tags input state
  const [currentUserTag, setCurrentUserTag] = useState("");

  // Form submission loading state (covers both knowledge base training and save)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create filters object for API calls
  const apiFilters = formData.voiceProvider === "ElevenLabs" || formData.voiceProvider === "StreamElements" ? {
    name: voiceFilters.name || undefined,
    gender: (voiceFilters.gender && voiceFilters.gender !== 'any') ? voiceFilters.gender : undefined,
    country: (voiceFilters.country && voiceFilters.country !== 'any') ? voiceFilters.country : undefined,
    language: formData.language || undefined, // Pass selected language to API
  } : undefined;

  // Fetch ElevenLabs voices with filters
  const { data: elevenLabsVoicesData, isLoading: isLoadingVoices } = useElevenLabsVoices(
    formData.voiceProvider === "ElevenLabs" ? apiFilters : undefined
  );
  const elevenLabsVoices = elevenLabsVoicesData?.data || [];

  // Fetch Stream Elements voices with filters
  const { data: streamElementsVoicesData, isLoading: isLoadingStreamElementsVoices, error: streamElementsError } = useStreamElementsVoices(
    formData.voiceProvider === "StreamElements" ? apiFilters : undefined
  );
  const streamElementsVoices = streamElementsVoicesData?.data || [];

  // Apply filters to static voices (Rime)
  const applyStaticFilters = (voices: any[], provider: string) => {
    if (formData.voiceProvider !== provider) return voices;

    let filtered = voices;

    // Apply language-based filtering first
    if (provider === "Rime") {
      if (formData.language === "es") {
        // For Spanish, show voices that support Spanish/Latino heritage
        filtered = filtered.filter(voice => 
          voice.description?.toLowerCase().includes('latina') ||
          voice.description?.toLowerCase().includes('bilingual') ||
          voice.voice_id === 'phoenix' // Specifically supports Spanish
        );
      } else if (formData.language === "en") {
        // For English, show all voices except French-specific ones
        filtered = filtered.filter(voice => 
          !voice.description?.toLowerCase().includes('french-specific')
        );
      } else if (formData.language === "fr") {
        // For French, show English voices as fallback since Rime doesn't have specific French voices yet
        filtered = filtered.filter(voice => 
          !voice.description?.toLowerCase().includes('spanish-only')
        );
      }
    }

    if (voiceFilters.name) {
      filtered = filtered.filter(voice => 
        voice.name.toLowerCase().includes(voiceFilters.name.toLowerCase())
      );
    }

    if (voiceFilters.gender && voiceFilters.gender !== 'any') {
      filtered = filtered.filter(voice => {
        if (provider === "Rime") {
          // Extract gender from description for Rime voices
          return voice.description?.toLowerCase().includes(voiceFilters.gender.toLowerCase());
        }
        return true;
      });
    }

    if (voiceFilters.country && voiceFilters.country !== 'any') {
      filtered = filtered.filter(voice => {
        if (provider === "Rime") {
          return voice.description?.toLowerCase().includes(voiceFilters.country.toLowerCase());
        }
        return true;
      });
    }

    return filtered;
  };



  // Rime flagship voices compatible with Mist v2 model - Based on official Rime documentation
  const allRimeVoices = [
    // Flagship English voices (Arcana/Mist compatible)
    { voice_id: "luna", name: "Luna", description: "Female, chill but excitable, Gen-Z optimist" },
    { voice_id: "celeste", name: "Celeste", description: "Female, warm, laid-back, fun-loving" },
    { voice_id: "orion", name: "Orion", description: "Male, older, African American, happy" },
    { voice_id: "ursa", name: "Ursa", description: "Male, 20 years old, encyclopedic knowledge of 2000s emo" },
    { voice_id: "astra", name: "Astra", description: "Female, young, wide-eyed" },
    { voice_id: "esther", name: "Esther", description: "Female, older, Chinese American, loving" },
    { voice_id: "estelle", name: "Estelle", description: "Female, middle-aged, African-American, sounds so sweet" },
    { voice_id: "andromeda", name: "Andromeda", description: "Female, young, breathy, yoga vibes" },
    // Additional conversational voices
    { voice_id: "maya", name: "Maya", description: "Female, conversational, natural conversation style" },
    { voice_id: "ana", name: "Ana", description: "Female, IVR-optimized, perfect for call centers" },
    // Demographic diverse voices
    { voice_id: "colby", name: "Colby", description: "Male, Southern accent, warm storyteller" },
    { voice_id: "sage", name: "Sage", description: "Female, Midwestern, professional narrator" },
    { voice_id: "river", name: "River", description: "Non-binary, LGBT voice, inclusive and modern" },
    { voice_id: "phoenix", name: "Phoenix", description: "Male, Latina heritage, bilingual capable" }
  ];
  const rimeVoices = applyStaticFilters(allRimeVoices, "Rime");

  // Deepgram voices - placeholder array (Deepgram is primarily a transcriber, not voice provider)
  const deepgramVoices: any[] = [];

  // State declarations are moved earlier to avoid reference errors

  // Update form when selectedAssistant changes
  useEffect(() => {
    if (selectedAssistant) {
      console.log('🔍 [Assistant Form] Raw selectedAssistant data from API:', {
        id: selectedAssistant._id,
        name: selectedAssistant.name,
        enableCallTransfer: selectedAssistant.enableCallTransfer,
        transferPhoneNumber: selectedAssistant.transferPhoneNumber,
        fullObject: selectedAssistant
      });

      // Set form data and then log it
      const newFormData = {
        name: selectedAssistant.name || "",
        description: selectedAssistant.description || "",
        voiceProvider: selectedAssistant.voiceProvider || "ElevenLabs",
        voice: selectedAssistant.voice || "",
        transcriber: selectedAssistant.transcriber || "Deepgram",
        transcriberVoiceId: selectedAssistant.transcriberVoiceId || "",
        phoneNumberId: selectedAssistant.phoneNumberId || "none",
        modelProvider: selectedAssistant.modelProvider || "ChatGPT",
        aiModel: selectedAssistant.aiModel || "gpt-4o-mini",
        firstMessage: selectedAssistant.firstMessage || "",
        userSpeaksFirst: selectedAssistant.userSpeaksFirst || false,
        systemPrompt: selectedAssistant.systemPrompt || "",
        // Parse systemPrompt back into individual fields
        identity: (() => {
          const match = selectedAssistant.systemPrompt?.match(/\*\*Identity:\*\*\s*([^*]+?)(?=\*\*[A-Za-z]|\n\n|$)/);
          return match ? match[1].trim() : "";
        })(),
        style: (() => {
          const match = selectedAssistant.systemPrompt?.match(/\*\*Style:\*\*\s*([^*]+?)(?=\*\*[A-Za-z]|\n\n|$)/);
          return match ? match[1].trim() : "";
        })(),
        goals: (() => {
          const match = selectedAssistant.systemPrompt?.match(/\*\*Goals:\*\*\s*([^*]+?)(?=\*\*[A-Za-z]|\n\n|$)/);
          return match ? match[1].trim() : "";
        })(),
        responseGuidelines: (() => {
          const match = selectedAssistant.systemPrompt?.match(/\*\*Response Guidelines:\*\*\s*([^*]+?)(?=\*\*[A-Za-z]|\n\n|$)/);
          return match ? match[1].trim() : "";
        })(),
        errorHandling: (() => {
          const match = selectedAssistant.systemPrompt?.match(/\*\*Error Handling\/Fallback:\*\*\s*([^*]+?)(?=\*\*[A-Za-z]|\n\n|$)/);
          return match ? match[1].trim() : "";
        })(),
        language: selectedAssistant.languages?.[0] || "en",
        voiceModel: selectedAssistant.voiceModel || "rime",
        gender: selectedAssistant.gender || "neutral",
        knowledgeBase: selectedAssistant.knowledgeBase || [],
        ragResponse: selectedAssistant.ragResponse || "",
        trigger: selectedAssistant.trigger || "TRANSCRIPT",
        postWorkflow: selectedAssistant.postWorkflow || "none",
        workflowIds: selectedAssistant.workflowIds || [],
        maxTokens: (() => {
          const value = selectedAssistant.maxTokens;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') return parseInt(value) || 150;
          return 150;
        })(),
        temperature: (() => {
          const value = selectedAssistant.temperature;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') return parseFloat(value) || 0.7;
          return 0.7;
        })(),
        speed: (() => {
          const value = selectedAssistant.speed;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') return parseFloat(value) || 1.0;
          return 1.0;
        })(),
        // Call settings
        callRecording: selectedAssistant.callRecording ?? true,
        callRecordingFormat: selectedAssistant.callRecordingFormat || "mp3",
        backgroundAmbientSound: selectedAssistant.backgroundAmbientSound || "",
        rememberLeadPreference: selectedAssistant.rememberLeadPreference ?? true,
        voicemailDetection: selectedAssistant.voicemailDetection ?? true,
        voicemailMessage: selectedAssistant.voicemailMessage || "Hi there! We tried reaching you but couldn't connect, so we're leaving a quick message. This is Sarah calling on behalf of [Your Company]. Just wanted to follow up on your recent interest. Feel free to call us back at your convenience or check your email for more info. Looking forward to speaking with you soon!",
        // Call transfer settings
        enableCallTransfer: selectedAssistant.enableCallTransfer ?? false,
        transferPhoneNumber: selectedAssistant.transferPhoneNumber || "",
        userTags: selectedAssistant.userTags || [],
        systemTags: selectedAssistant.systemTags || [],
      };

      setFormData(newFormData);

      // Set selected knowledge base items from the agent's knowledgeBase field
      if (selectedAssistant.knowledgeBase && Array.isArray(selectedAssistant.knowledgeBase)) {
        setSelectedKnowledgeBaseItems(selectedAssistant.knowledgeBase);
      }

      // Note: File uploads are no longer supported in assistant creation
      // All PDFs must be selected from Knowledge Base

      console.log('📝 [Assistant Form] Setting form data:', {
        assistantName: selectedAssistant.name,
        voiceProvider: selectedAssistant.voiceProvider,
        savedVoice: selectedAssistant.voice,
        formDataVoice: newFormData.voice,
        voicemailDetection: selectedAssistant.voicemailDetection,
        voicemailMessage: selectedAssistant.voicemailMessage,
        formDataVoicemailDetection: newFormData.voicemailDetection,
        formDataVoicemailMessage: newFormData.voicemailMessage,
        // Call transfer settings check
        savedEnableCallTransfer: selectedAssistant.enableCallTransfer,
        savedTransferPhoneNumber: selectedAssistant.transferPhoneNumber,
        formDataEnableCallTransfer: newFormData.enableCallTransfer,
        formDataTransferPhoneNumber: newFormData.transferPhoneNumber
      });
    } else {
      // Reset form for new assistant
      setFormData({
        name: "",
        description: "",
        voiceProvider: "ElevenLabs",
        voice: "",
        transcriber: "Deepgram",
        transcriberVoiceId: "",
        phoneNumberId: "none",
        modelProvider: "ChatGPT",
        aiModel: "gpt-4o-mini",
        firstMessage: "",
        userSpeaksFirst: false,
        systemPrompt: "",
        // Individual persona fields
        identity: "",
        style: "",
        goals: "",
        responseGuidelines: "",
        errorHandling: "",
        language: "en",
        voiceModel: "rime",
        gender: "neutral",
        knowledgeBase: [],
        ragResponse: "",
        trigger: "TRANSCRIPT",
        postWorkflow: "none",
        workflowIds: [],
        maxTokens: 150,
        temperature: 0.7,
        speed: 1.0,
        // Call settings
        callRecording: true,
        callRecordingFormat: "mp3",
        backgroundAmbientSound: "",
        rememberLeadPreference: true,
        voicemailDetection: true,
        voicemailMessage: "Hi there! We tried reaching you but couldn't connect, so we're leaving a quick message. This is Sarah calling on behalf of [Your Company]. Just wanted to follow up on your recent interest. Feel free to call us back at your convenience or check your email for more info. Looking forward to speaking with you soon!",
        // Call transfer settings
        enableCallTransfer: false,
        transferPhoneNumber: "",
        userTags: [] as string[],
        systemTags: [] as string[],
      });
      setSelectedKnowledgeBaseItems([]);
    }
  }, [selectedAssistant]);

  // Set default voice when voices are loaded - only for new assistants or invalid voices
  useEffect(() => {
    if (formData.voiceProvider === "ElevenLabs" && elevenLabsVoices.length > 0) {
      // For existing assistants, restore saved voice if not already set
      if (selectedAssistant && selectedAssistant.voice && !formData.voice) {
        const savedVoiceExists = elevenLabsVoices.some(voice => voice.voice_id === selectedAssistant.voice);
        if (savedVoiceExists) {
          console.log('🔄 [Voice Load] Restoring saved ElevenLabs voice on load:', selectedAssistant.voice);
          setFormData(prev => ({ ...prev, voice: selectedAssistant.voice }));
          return;
        }
      }

      // Only set default if no voice is selected or the current voice is not in the available voices
      const currentVoiceExists = elevenLabsVoices.some(voice => voice.voice_id === formData.voice);

      if (!formData.voice || !currentVoiceExists) {
        // Only set default for new assistants (not editing existing ones)
        if (!selectedAssistant) {
          const defaultVoice = elevenLabsVoices[0];
          if (defaultVoice) {
            setFormData(prev => ({ ...prev, voice: defaultVoice.voice_id }));
          }
        }
      }
    }



    if (formData.voiceProvider === "Rime") {
      // For existing assistants, restore saved voice if not already set
      if (selectedAssistant && selectedAssistant.voice && !formData.voice) {
        const savedVoiceExists = rimeVoices.some(voice => voice.voice_id === selectedAssistant.voice);
        if (savedVoiceExists) {
          setFormData(prev => ({ ...prev, voice: selectedAssistant.voice }));
          return;
        }
      }

      // Set default voice if none selected
      if (!formData.voice) {
        setFormData(prev => ({ ...prev, voice: rimeVoices[0].voice_id }));
      }
    }

    if (formData.voiceProvider === "StreamElements" && streamElementsVoices.length > 0) {
      // For existing assistants, restore saved voice if not already set
      if (selectedAssistant && selectedAssistant.voice && !formData.voice) {
        const savedVoiceExists = streamElementsVoices.some(voice => voice.voice_id === selectedAssistant.voice);
        if (savedVoiceExists) {
          console.log('🔄 [Voice Load] Restoring saved Stream Elements voice on load:', selectedAssistant.voice);
          setFormData(prev => ({ ...prev, voice: selectedAssistant.voice }));
          return;
        }
      }

      // Only set default if no voice is selected or the current voice is not in the available voices
      const currentVoiceExists = streamElementsVoices.some(voice => voice.voice_id === formData.voice);

      if (!formData.voice || !currentVoiceExists) {
        // Only set default for new assistants (not editing existing ones)
        if (!selectedAssistant) {
          const defaultVoice = streamElementsVoices[0];
          if (defaultVoice) {
            setFormData(prev => ({ ...prev, voice: defaultVoice.voice_id }));
          }
        }
      }
    }
  }, [elevenLabsVoices, streamElementsVoices, formData.voiceProvider, formData.voice, selectedAssistant]);

  // Reset voice when provider changes
  const handleProviderChange = (provider: string) => {
    handleInputChange("voiceProvider", provider);

    // Clear voice filters when changing provider
    setVoiceFilters({ name: '', gender: '', country: '' });

    if (provider === "ElevenLabs" && elevenLabsVoices.length > 0) {
      // For existing assistants, try to restore the saved voice from database
      if (selectedAssistant && selectedAssistant.voice) {
        console.log('🔄 [Voice Switch] Attempting to restore ElevenLabs voice:', {
          assistantName: selectedAssistant.name,
          savedVoice: selectedAssistant.voice,
          availableVoices: elevenLabsVoices.map(v => `${v.name} (${v.voice_id})`).slice(0, 3)
        });
        const savedVoiceExists = elevenLabsVoices.some(voice => voice.voice_id === selectedAssistant.voice);
        if (savedVoiceExists) {
          console.log('✅ [Voice Switch] Found saved ElevenLabs voice, restoring:', selectedAssistant.voice);
          handleInputChange("voice", selectedAssistant.voice);
        } else {
          console.log('❌ [Voice Switch] Saved ElevenLabs voice not found, using first available');
          handleInputChange("voice", elevenLabsVoices[0].voice_id);
        }
      } else if (!formData.voice) {
        // For new assistants or no saved voice, use first available
        handleInputChange("voice", elevenLabsVoices[0].voice_id);
      }

    } else if (provider === "Rime") {
      // For Rime, set the first available voice
      if (selectedAssistant && selectedAssistant.voice) {
        const savedVoiceExists = rimeVoices.some(voice => voice.voice_id === selectedAssistant.voice);
        if (savedVoiceExists) {
          handleInputChange("voice", selectedAssistant.voice);
        } else {
          handleInputChange("voice", rimeVoices[0].voice_id);
        }
      } else {
        handleInputChange("voice", rimeVoices[0].voice_id);
      }
    } else if (provider === "StreamElements" && streamElementsVoices.length > 0) {
      // For existing assistants, try to restore the saved voice from database
      if (selectedAssistant && selectedAssistant.voice) {
        console.log('🔄 [Voice Switch] Attempting to restore Stream Elements voice:', {
          assistantName: selectedAssistant.name,
          savedVoice: selectedAssistant.voice,
          availableVoices: streamElementsVoices.map(v => `${v.name} (${v.voice_id})`).slice(0, 3)
        });
        const savedVoiceExists = streamElementsVoices.some(voice => voice.voice_id === selectedAssistant.voice);
        if (savedVoiceExists) {
          console.log('✅ [Voice Switch] Found saved Stream Elements voice, restoring:', selectedAssistant.voice);
          handleInputChange("voice", selectedAssistant.voice);
        } else {
          console.log('❌ [Voice Switch] Saved Stream Elements voice not found, using first available');
          handleInputChange("voice", streamElementsVoices[0].voice_id);
        }
      } else if (!formData.voice) {
        // For new assistants or no saved voice, use first available
        handleInputChange("voice", streamElementsVoices[0].voice_id);
      }
    } else {
      // Clear voice for other providers
      handleInputChange("voice", "");
    }
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedAssistant && selectedAssistant._id) {
        // Handle MongoDB ObjectId properly for browser
        const agentId = typeof selectedAssistant._id === 'object' && selectedAssistant._id?.buffer
          ? Object.values(selectedAssistant._id.buffer).map((byte: any) => byte.toString(16).padStart(2, '0')).join('')
          : selectedAssistant._id?.toString();
        return apiRequest("PUT", `/api/agents/${agentId}`, data);
      } else {
        return apiRequest("POST", "/api/agents", data);
      }
    },
    onSuccess: () => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Success",
        description: selectedAssistant ? "Assistant updated successfully" : "Assistant created successfully",
      });

      // Reset form and selection for new assistant
      if (!selectedAssistant) {
        setFormData({
          name: "",
          description: "",
          voiceProvider: "ElevenLabs",
          voice: "",
          transcriber: "Deepgram",
          transcriberVoiceId: "",
          phoneNumberId: "none",
          modelProvider: "ChatGPT",
          aiModel: "gpt-4o-mini",
          firstMessage: "",
          userSpeaksFirst: false,
          systemPrompt: "",
          identity: "",
          style: "",
          goals: "",
          responseGuidelines: "",
          errorHandling: "",
          language: "en",
          voiceModel: "rime",
          gender: "neutral",
          knowledgeBase: [],
          ragResponse: "",
          trigger: "TRANSCRIPT",
          postWorkflow: "none",
          workflowIds: [],
          maxTokens: 150,
          temperature: 0.7,
          speed: 1.0,
          // Call settings
          callRecording: true,
          callRecordingFormat: "mp3",
          backgroundAmbientSound: "",
          rememberLeadPreference: true,
          voicemailDetection: true,
          voicemailMessage: "Hi there! We tried reaching you but couldn't connect, so we're leaving a quick message. This is Sarah calling on behalf of [Your Company]. Just wanted to follow up on your recent interest. Feel free to call us back at your convenience or check your email for more info. Looking forward to speaking with you soon!",
          // Call transfer settings
          enableCallTransfer: false,
          transferPhoneNumber: "",
          userTags: [] as string[],
          systemTags: [] as string[],
        });
        setSelectedKnowledgeBaseItems([]);
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to save assistant",
        variant: "destructive",
      });
    },
  });

  // Function to generate RAG responses from selected knowledge base items only
  const generateRAGFromKnowledgeBase = async (): Promise<string> => {
    let combinedRAG = '';

    console.log('🧠 [RAG Generate] Starting RAG generation from Knowledge Base...');
    console.log('🧠 [RAG Generate] Selected knowledge base items:', selectedKnowledgeBaseItems);

    // Generate RAG responses from selected knowledge base items
    if (selectedKnowledgeBaseItems.length > 0) {
      try {
        console.log('🧠 [RAG Combine] Fetching RAG responses for selected knowledge base items:', selectedKnowledgeBaseItems);

        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/knowledge', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          const allKnowledgeItems = result.data || [];

          // Filter selected items and extract their RAG responses
          const selectedItems = allKnowledgeItems.filter((item: any) => 
            selectedKnowledgeBaseItems.includes(item._id)
          );

          // Generate RAG responses for selected knowledge base PDFs
          for (const item of selectedItems) {
            try {
              console.log(`🧠 [RAG Generate] Processing knowledge base item: ${item.name}`);

              // Generate RAG response for this PDF
              const ragResponse = await fetch('/api/rag/process-knowledge-base', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  knowledgeBaseId: item._id,
                  agentId: selectedAssistant?._id?.toString() || 'new_agent'
                }),
              });

              if (ragResponse.ok) {
                const ragResult = await ragResponse.json();
                if (ragResult.success && ragResult.data.ragResponse) {
                  const ragData = ragResult.data.ragResponse;
                  const ragText = `Summary: ${ragData.summary}\n\nKey Points:\n${ragData.keyPoints.map((point: string) => `• ${point}`).join('\n')}`;

                  combinedRAG = combinedRAG 
                    ? `${combinedRAG}\n\n--- ${item.name} (Knowledge Base) ---\n${ragText}`
                    : `--- ${item.name} (Knowledge Base) ---\n${ragText}`;

                  console.log(`✅ [RAG Generate] Generated RAG for ${item.name}`);
                } else {
                  console.warn(`⚠️ [RAG Generate] No RAG response for ${item.name}`);
                }
              } else {
                const errorResult = await ragResponse.json().catch(() => ({}));
                const errorMsg = errorResult.error || `HTTP ${ragResponse.status}`;
                console.error(`❌ [RAG Generate] Failed to generate RAG for ${item.name}:`, errorMsg);
                toast({
                  title: `Failed to process "${item.name}"`,
                  description: errorMsg.includes('not found') ? 'The PDF file for this document is missing. Please re-upload it.' : errorMsg,
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error(`❌ [RAG Generate] Error processing ${item.name}:`, error);
              toast({
                title: `Error processing "${item.name}"`,
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
                variant: "destructive",
              });
            }
          }

          console.log('✅ [RAG Combine] Successfully combined RAG responses from knowledge base items');
        } else {
          console.warn('⚠️ [RAG Combine] Failed to fetch knowledge base items for RAG combination');
        }
      } catch (error) {
        console.error('❌ [RAG Combine] Error combining RAG responses:', error);
      }
    }

    console.log('🧠 [RAG Generate] Final generated RAG length:', combinedRAG.length);
    return combinedRAG;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if knowledge base has changed by comparing IDs
      const previousKnowledgeBase = selectedAssistant?.knowledgeBase || [];
      const currentKnowledgeBase = selectedKnowledgeBaseItems;
      
      console.log('📊 [Knowledge Base Comparison]', {
        previousKB: previousKnowledgeBase,
        currentKB: currentKnowledgeBase,
        isEditing: !!selectedAssistant
      });
      
      // Sort both arrays to compare properly
      const prevIds = [...previousKnowledgeBase].sort();
      const currIds = [...currentKnowledgeBase].sort();
      
      // Check if knowledge base has changed
      const knowledgeBaseChanged = 
        prevIds.length !== currIds.length ||
        prevIds.some((id, index) => id !== currIds[index]);

      console.log('🔍 [Knowledge Base Check]', {
        prevCount: prevIds.length,
        currCount: currIds.length,
        changed: knowledgeBaseChanged,
        prevIds: prevIds,
        currIds: currIds
      });

      let ragResponse = formData.ragResponse; // Use existing by default

      // Only regenerate RAG if knowledge base has actually changed
      if (knowledgeBaseChanged) {
        console.log('🔄 [Knowledge Base] Knowledge base has changed, regenerating RAG...');
        ragResponse = await generateRAGFromKnowledgeBase();
      } else {
        console.log('✅ [Knowledge Base] No changes detected, keeping existing RAG response');
      }

    // For knowledge base, use selectedKnowledgeBaseItems (existing KB items)
    const knowledgeBaseIds = selectedKnowledgeBaseItems;

    // Concatenate persona fields into systemPrompt
    const concatenatedSystemPrompt = [
      formData.identity && `**Identity:** ${formData.identity}`,
      formData.style && `**Style:** ${formData.style}`,
      formData.goals && `**Goals:** ${formData.goals}`,
      formData.responseGuidelines && `**Response Guidelines:** ${formData.responseGuidelines}`,
      formData.errorHandling && `**Error Handling/Fallback:** ${formData.errorHandling}`
    ].filter(Boolean).join('\n\n');

    // Prepare data for backend with proper field mapping
    const agentData = {
      name: formData.name,
      description: formData.description,
      gender: formData.gender,
      aiModel: formData.aiModel,
      voiceProvider: formData.voiceProvider,
      voiceModel: formData.voiceModel,
      voice: formData.voice,
      transcriber: formData.transcriber,
      transcriberVoiceId: formData.transcriberVoiceId,
      modelProvider: formData.modelProvider,
      firstMessage: formData.firstMessage,
      userSpeaksFirst: formData.userSpeaksFirst,
      systemPrompt: concatenatedSystemPrompt,
      knowledgeBase: knowledgeBaseIds, // IDs of selected knowledge base items
      ragResponse: ragResponse, // Fresh RAG response from Knowledge Base items only
      trigger: formData.trigger,
      postWorkflow: formData.postWorkflow,
      workflowIds: formData.workflowIds,
      temperature: parseFloat(formData.temperature.toString()),
      maxTokens: parseInt(formData.maxTokens.toString()),
      speed: parseFloat(formData.speed.toString()),
      languages: [formData.language], // Convert single language to array
      country: "US", // Default country as required by backend
      profileImageUrl: null, // Default profile image
      phoneNumberId: formData.phoneNumberId === "none" ? null : formData.phoneNumberId, // Optional phone number link
      userTags: formData.userTags, // User generated tags
      systemTags: formData.systemTags, // System generated tags
      // Call settings
      callRecording: formData.callRecording,
      callRecordingFormat: formData.callRecordingFormat,
      backgroundAmbientSound: formData.backgroundAmbientSound,
      rememberLeadPreference: formData.rememberLeadPreference,
      voicemailDetection: formData.voicemailDetection,
      voicemailMessage: formData.voicemailMessage,
      // Call transfer settings
      enableCallTransfer: formData.enableCallTransfer,
      transferPhoneNumber: formData.transferPhoneNumber,
    };

    console.log('📞 [Frontend] Submitting agent data with call transfer settings:', {
      enableCallTransfer: agentData.enableCallTransfer,
      transferPhoneNumber: agentData.transferPhoneNumber,
      formDataTransfer: {
        enableCallTransfer: formData.enableCallTransfer,
        transferPhoneNumber: formData.transferPhoneNumber
      }
    });

      saveMutation.mutate(agentData);
    } catch (error) {
      console.error('❌ [Form Submit] Error during form submission:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to save assistant. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string | string[] | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // System tags options - expanded with more options
  const systemTagOptions = [
    "interested",
    "uninterested", 
    "interested if call > 30 seconds",
    "interested if call > 60 seconds",
    "voicemail",
    "rejections",
    "callback requested",
    "demo scheduled",
    "lead qualified",
    "not a fit",
    "wrong person",
    "follow up needed",
    "meeting scheduled",
    "product inquiry",
    "pricing request",
    "technical support",
    "complaint",
    "testimonial"
  ];

  // Handle adding user tag
  const handleAddUserTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentUserTag.trim()) {
      e.preventDefault();
      if (!formData.userTags.includes(currentUserTag.trim())) {
        handleInputChange("userTags", [...formData.userTags, currentUserTag.trim()]);
      }
      setCurrentUserTag("");
    }
  };

  // Handle removing user tag
  const handleRemoveUserTag = (tagToRemove: string) => {
    handleInputChange("userTags", formData.userTags.filter(tag => tag !== tagToRemove));
  };



  // Note: File upload functionality removed - PDFs must be selected from Knowledge Base only

  // File upload functionality removed - Knowledge Base selection only

  // File upload functionality removed

  // Drag and drop handlers removed

  // Validate all required fields
  const isFormValid = () => {
    const maxTokensValue = typeof formData.maxTokens === 'string' ? parseInt(formData.maxTokens) : formData.maxTokens;
    const temperatureValue = typeof formData.temperature === 'string' ? parseFloat(formData.temperature) : formData.temperature;

    const isValid = !!(
      formData.name?.trim() &&
      formData.voiceProvider &&
      formData.voice &&
      formData.transcriber &&
      formData.modelProvider &&
      formData.aiModel &&
      formData.gender &&
      formData.voiceModel &&
      formData.trigger &&
      formData.postWorkflow &&
      formData.language &&
      maxTokensValue > 0 &&
      temperatureValue >= 0 &&
      true // Form can be submitted anytime (no file processing)
    );

    // Debug logging for development
    if (!isValid && process.env.NODE_ENV === 'development') {
      console.log('Form validation failed:', {
        name: !!formData.name?.trim(),
        voiceProvider: !!formData.voiceProvider,
        voice: !!formData.voice,
        transcriber: !!formData.transcriber,
        modelProvider: !!formData.modelProvider,
        aiModel: !!formData.aiModel,
        gender: !!formData.gender,
        voiceModel: !!formData.voiceModel,
        trigger: !!formData.trigger,
        postWorkflow: !!formData.postWorkflow,
        language: !!formData.language,
        maxTokens: maxTokensValue,
        temperature: temperatureValue,
        formData: formData
      });
    }

    return isValid;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold">
          {selectedAssistant ? "Edit Assistant" : "Create Assistant"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {selectedAssistant 
            ? "Modify your assistant's configuration" 
            : "Configure your new AI voice assistant"
          }
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <TooltipProvider>
          <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-background border-b border-border rounded-none h-auto p-0 gap-2 lg:gap-0">
              <TabsTrigger 
                value="basics" 
                className="data-[state=active]:text-[#3B82F6] data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6] data-[state=inactive]:text-muted-foreground hover:text-[#3B82F6] pb-3 px-4 border-b-2 border-transparent transition-all duration-200 font-medium bg-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm lg:text-base"
              >
                Basics
              </TabsTrigger>
              <TabsTrigger 
                value="persona" 
                className="data-[state=active]:text-[#3B82F6] data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6] data-[state=inactive]:text-muted-foreground hover:text-[#3B82F6] pb-3 px-4 border-b-2 border-transparent transition-all duration-200 font-medium bg-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm lg:text-base"
              >
                Persona
              </TabsTrigger>
              <TabsTrigger 
                value="model" 
                className="data-[state=active]:text-[#3B82F6] data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6] data-[state=inactive]:text-muted-foreground hover:text-[#3B82F6] pb-3 px-4 border-b-2 border-transparent transition-all duration-200 font-medium bg-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm lg:text-base"
              >
                <span className="hidden lg:inline">Media & Knowledge</span>
                <span className="lg:hidden">Media</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="data-[state=active]:text-[#3B82F6] data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6] data-[state=inactive]:text-muted-foreground hover:text-[#3B82F6] pb-3 px-4 border-b-2 border-transparent transition-all duration-200 font-medium bg-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm lg:text-base"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="data-[state=active]:text-[#3B82F6] data-[state=active]:border-b-2 data-[state=active]:border-[#3B82F6] data-[state=inactive]:text-muted-foreground hover:text-[#3B82F6] pb-3 px-4 border-b-2 border-transparent transition-all duration-200 font-medium bg-transparent rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm lg:text-base"
              >
                <span className="hidden lg:inline">Post Call Analysis</span>
                <span className="lg:hidden">Analysis</span>
              </TabsTrigger>
            </TabsList>

            {/* Basics Tab */}
            <TabsContent value="basics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Set up the fundamental details of your assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter assistant name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Describe what this assistant does"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={formData.language} 
                      onValueChange={(value) => handleInputChange("language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumberId">Phone Number</Label>
                    <Select 
                      value={formData.phoneNumberId} 
                      onValueChange={(value) => handleInputChange("phoneNumberId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phone number (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No phone number</SelectItem>
                        {phoneNumbers?.map((phoneNumber: any) => (
                          <SelectItem key={phoneNumber._id} value={phoneNumber._id}>
                            {phoneNumber.phoneNumber} ({phoneNumber.provider})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this assistant to a specific phone number for incoming calls
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstMessage">First Message</Label>
                    <Textarea
                      id="firstMessage"
                      value={formData.firstMessage}
                      onChange={(e) => handleInputChange("firstMessage", e.target.value)}
                      placeholder="What should your assistant say when the call starts?"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="userSpeaksFirst">User speaks first</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow the user to speak before the assistant starts
                        </p>
                      </div>
                      <Switch
                        id="userSpeaksFirst"
                        checked={formData.userSpeaksFirst}
                        onCheckedChange={(checked) => handleInputChange("userSpeaksFirst", checked)}
                        data-testid="toggle-user-speaks-first"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="workflowIds">Workflows</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Choose workflows to execute after each call.<br />
                          Multiple workflows can run in parallel to send emails, process data,<br />
                          and trigger actions based on call events like connection and completion.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="space-y-3">
                      {workflows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No workflows created yet</p>
                      ) : (
                        <Select
                          onValueChange={(value) => {
                            if (value && !formData.workflowIds.includes(value)) {
                              handleInputChange("workflowIds", [...formData.workflowIds, value]);
                            }
                          }}
                        >
                          <SelectTrigger className="bg-input border-border text-foreground focus:border-primary">
                            <SelectValue placeholder="Choose workflows to add..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {workflows
                              .filter((workflow: any) => !formData.workflowIds.includes(workflow._id))
                              .map((workflow: any) => (
                                <SelectItem 
                                  key={workflow._id} 
                                  value={workflow._id}
                                  className="text-popover-foreground hover:bg-accent focus:bg-primary/20 focus:text-primary"
                                >
                                  {workflow.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {formData.workflowIds.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">Selected workflows:</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.workflowIds.map((workflowId, index) => {
                            const workflow = workflows.find((w: any) => w._id === workflowId);
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-500 px-3 py-1 rounded-md text-sm"
                              >
                                <span>{workflow?.name || 'Unknown Workflow'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleInputChange("workflowIds", formData.workflowIds.filter(id => id !== workflowId))}
                                  className="text-blue-500 hover:text-blue-400 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Persona Tab */}
            <TabsContent value="persona" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assistant Persona Configuration</CardTitle>
                  <CardDescription>
                    Define your assistant's identity, communication style, goals, and response behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="identity">Identity</Label>
                      <Textarea
                        id="identity"
                        value={formData.identity || ""}
                        onChange={(e) => handleInputChange("identity", e.target.value)}
                        placeholder="Define the agent's persona and background"
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Who is the assistant? Define their role, expertise, and personality.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="style">Style</Label>
                      <Textarea
                        id="style"
                        value={formData.style || ""}
                        onChange={(e) => handleInputChange("style", e.target.value)}
                        placeholder="Set the tone and manner of the agent's responses"
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        How should the assistant communicate? Tone, formality, and approach.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goals">Goals</Label>
                    <Textarea
                      id="goals"
                      value={formData.goals || ""}
                      onChange={(e) => handleInputChange("goals", e.target.value)}
                      placeholder="Outline the objectives the agent should achieve"
                      className="min-h-[100px] text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      What should the assistant accomplish during conversations?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responseGuidelines">Response Guidelines</Label>
                      <Textarea
                        id="responseGuidelines"
                        value={formData.responseGuidelines || ""}
                        onChange={(e) => handleInputChange("responseGuidelines", e.target.value)}
                        placeholder="Establish rules for how the agent should respond"
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Rules and guidelines for appropriate responses.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="errorHandling">Error Handling/Fallback</Label>
                      <Textarea
                        id="errorHandling"
                        value={formData.errorHandling || ""}
                        onChange={(e) => handleInputChange("errorHandling", e.target.value)}
                        placeholder="Specify how the agent should handle unexpected situations"
                        className="min-h-[120px] text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        How should the assistant handle errors or unclear requests?
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media & Knowledge Tab */}
            <TabsContent value="model" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Media & Knowledge Settings</CardTitle>
                  <CardDescription>
                    Configure voice settings, knowledge base, and speech speed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Voice Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="voiceProvider">Voice Provider</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose the AI service that will generate your assistant's voice.<br />
                            ElevenLabs: Premium quality with emotional voices<br />
                            Deepgram: Fast, reliable voices with various accents</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select 
                        value={formData.voiceProvider} 
                        onValueChange={handleProviderChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Voice Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                          <SelectItem value="Rime">Rime</SelectItem>
                          <SelectItem value="StreamElements">Stream Elements</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="transcriber">Transcriber</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The service that converts speech to text during calls.<br />
                            Deepgram provides high-accuracy real-time transcription<br />
                            for understanding what callers are saying.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select 
                        value={formData.transcriber} 
                        onValueChange={(value) => handleInputChange("transcriber", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Transcriber" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Deepgram">Deepgram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="voice">Voice</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the specific voice your assistant will use.<br />
                          Each voice has different characteristics like accent, gender, and tone.<br />
                          Preview voices on the provider's website before choosing.</p>
                        </TooltipContent>
                      </Tooltip>
                      {formData.voiceProvider && formData.voiceProvider !== "" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setShowFilters(!showFilters)}
                              className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-pointer"
                            >
                              <svg 
                                fill="currentColor" 
                                viewBox="0 0 24 24" 
                                className="h-4 w-4"
                              >
                                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                              </svg>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Filter voices by name, gender, and accent</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Collapsible Filter Panel */}
                    {formData.voiceProvider && formData.voiceProvider !== "" && showFilters && (
                      <div className="bg-card p-4 rounded-lg border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-foreground">Filter Voices</h3>
                          <span className="text-xs text-muted-foreground">
                            {formData.voiceProvider === "ElevenLabs" && isLoadingVoices ? (
                              "Loading..."
                            ) : formData.voiceProvider === "StreamElements" && isLoadingStreamElementsVoices ? (
                              "Loading..."
                            ) : formData.voiceProvider === "ElevenLabs" ? (
                              `${elevenLabsVoices.length} voices found`
                            ) : formData.voiceProvider === "StreamElements" ? (
                              `${streamElementsVoices.length} voices found`
                            ) : formData.voiceProvider === "Deepgram" ? (
                              `${deepgramVoices.length} voices found`
                            ) : formData.voiceProvider === "Rime" ? (
                              `${rimeVoices.length} voices found`
                            ) : null}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                            <Input
                              placeholder="Search by name"
                              value={voiceFilters.name}
                              onChange={(e) => setVoiceFilters(prev => ({ ...prev, name: e.target.value }))}
                              className="h-9 text-sm bg-input border-border text-foreground placeholder-muted-foreground focus:border-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                            <Select
                              value={voiceFilters.gender}
                              onValueChange={(value) => setVoiceFilters(prev => ({ ...prev, gender: value }))}
                            >
                              <SelectTrigger className="h-9 text-sm bg-input border-border text-foreground focus:border-ring">
                                <SelectValue placeholder="Any gender" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="any" className="text-popover-foreground focus:bg-accent">Any gender</SelectItem>
                                <SelectItem value="male" className="text-popover-foreground focus:bg-accent">Male</SelectItem>
                                <SelectItem value="female" className="text-popover-foreground focus:bg-accent">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-300 dark:text-gray-300">Country/Accent</Label>
                            <Select
                              value={voiceFilters.country}
                              onValueChange={(value) => setVoiceFilters(prev => ({ ...prev, country: value }))}
                            >
                              <SelectTrigger className="h-9 text-sm bg-gray-800 dark:bg-gray-800 border-gray-600 dark:border-gray-600 text-white dark:text-white focus:border-gray-500 dark:focus:border-gray-500">
                                <SelectValue placeholder="Any accent" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 dark:bg-gray-800 border-gray-600 dark:border-gray-600">
                                <SelectItem value="any" className="text-popover-foreground focus:bg-accent">Any accent</SelectItem>
                                <SelectItem value="american" className="text-popover-foreground focus:bg-accent">American</SelectItem>
                                <SelectItem value="british" className="text-popover-foreground focus:bg-accent">British</SelectItem>
                                <SelectItem value="australian" className="text-popover-foreground focus:bg-accent">Australian</SelectItem>
                                <SelectItem value="canadian" className="text-popover-foreground focus:bg-accent">Canadian</SelectItem>
                                <SelectItem value="irish" className="text-popover-foreground focus:bg-accent">Irish</SelectItem>
                                <SelectItem value="welsh" className="text-popover-foreground focus:bg-accent">Welsh</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setVoiceFilters({ name: '', gender: 'any', country: 'any' })}
                            className="text-xs text-gray-400 hover:text-gray-300 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                          >
                            Clear filters
                          </button>
                        </div>
                      </div>
                    )}
                    <Select 
                      value={formData.voice} 
                      onValueChange={(value) => handleInputChange("voice", value)}
                      disabled={(formData.voiceProvider === "ElevenLabs" && isLoadingVoices) || 
                               (formData.voiceProvider === "StreamElements" && isLoadingStreamElementsVoices) ||
                               (formData.voiceProvider !== "ElevenLabs" && formData.voiceProvider !== "Deepgram" && formData.voiceProvider !== "Rime" && formData.voiceProvider !== "StreamElements")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          formData.voiceProvider === "ElevenLabs" 
                            ? (isLoadingVoices ? "Loading voices..." : "Select Voice")
                            : formData.voiceProvider === "Deepgram"
                              ? "Select Deepgram Voice"
                              : formData.voiceProvider === "Rime"
                                ? "Select Rime Voice"
                                : formData.voiceProvider === "StreamElements"
                                  ? (isLoadingStreamElementsVoices ? "Loading voices..." : "Select Voice")
                                  : "Select a voice provider first"
                        }>
                          {/* Show only voice name in the closed selector */}
                          {formData.voice && (
                            <span className="font-medium">
                              {formData.voiceProvider === "ElevenLabs" && 
                                elevenLabsVoices.find((v: any) => v.voice_id === formData.voice)?.name}
                              {formData.voiceProvider === "Deepgram" && 
                                deepgramVoices.find((v: any) => v.model === formData.voice)?.name}
                              {formData.voiceProvider === "Rime" && 
                                rimeVoices.find((v: any) => v.voice_id === formData.voice)?.name}
                              {formData.voiceProvider === "StreamElements" && 
                                streamElementsVoices.find((v: any) => v.voice_id === formData.voice)?.name}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {formData.voiceProvider === "ElevenLabs" && elevenLabsVoices.map((voice: any) => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id} className="py-3">
                            <div className="flex flex-col space-y-1">
                              <span className="font-medium text-sm">{voice.name}</span>
                              {voice.personality && (
                                <span className="text-xs text-gray-500">
                                  {voice.personality.gender.toLowerCase()}, {voice.personality.age.toLowerCase()}, {voice.personality.accent.toLowerCase()}, {voice.personality.tone.join(', ').toLowerCase()}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        {formData.voiceProvider === "Deepgram" && deepgramVoices.map((voice: any) => (
                          <SelectItem key={voice.model} value={voice.model} className="py-3">
                            <div className="flex flex-col space-y-1">
                              <span className="font-medium text-sm">{voice.name}</span>
                              <span className="text-xs text-gray-500">{voice.gender} • {voice.accent}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {formData.voiceProvider === "Rime" && rimeVoices.map((voice: any) => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id} className="py-3">
                            <div className="flex flex-col space-y-1">
                              <span className="font-medium text-sm">{voice.name}</span>
                              <span className="text-xs text-gray-500">{voice.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {formData.voiceProvider === "StreamElements" && streamElementsVoices.map((voice: any) => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id} className="py-3">
                            <div className="flex flex-col space-y-1">
                              <span className="font-medium text-sm">{voice.name}</span>
                              <span className="text-xs text-gray-500">
                                {voice.gender?.toLowerCase()}, {voice.age?.toLowerCase()}, {voice.accent?.toLowerCase()}, {voice.tone?.join(', ').toLowerCase()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        {formData.voiceProvider !== "ElevenLabs" && formData.voiceProvider !== "Deepgram" && formData.voiceProvider !== "Rime" && formData.voiceProvider !== "StreamElements" && (
                          <SelectItem value="default" disabled>Select a voice provider first</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="knowledgeBase">Knowledge Base</Label>
                    <KnowledgeBaseSelector 
                      selectedItems={selectedKnowledgeBaseItems}
                      onSelectionChange={setSelectedKnowledgeBaseItems}
                      showUpload={true}
                    />
                  </div>

                  {/* Speed Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="speed" className="text-foreground">Speech Speed</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Controls how fast the AI assistant speaks during calls.<br />
                            Slower: More deliberate, easier to understand<br />
                            Faster: More energetic, conversational pace</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-3">
                      <Slider
                        id="speed"
                        min={0.25}
                        max={4.0}
                        step={0.25}
                        value={[formData.speed]}
                        onValueChange={(value) => handleInputChange("speed", value[0].toString())}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Very Slow (0.25x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Very Fast (4.0x)</span>
                      </div>
                      <p className="text-sm text-center text-foreground bg-muted rounded px-2 py-1">
                        Speed: {formData.speed}x
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adjust speech speed for optimal conversation flow
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#3B82F6]">Settings</CardTitle>
                  <CardDescription>
                    Configure call recording, voicemail detection and other assistant settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Left Column - Call Settings */}
                    <div className="space-y-6">
                      {/* Call Recording */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="callRecording" className="text-foreground">Call Recording</Label>
                        <Switch
                          id="callRecording"
                          checked={formData.callRecording}
                          onCheckedChange={(checked) => handleInputChange("callRecording", checked)}
                        />
                      </div>

                      {/* Call Recording Format */}
                      <div className="space-y-2">
                        <Label htmlFor="callRecordingFormat" className="text-foreground">Call Recording Format</Label>
                        <Select 
                          value={formData.callRecordingFormat} 
                          onValueChange={(value) => handleInputChange("callRecordingFormat", value)}
                        >
                          <SelectTrigger className="bg-input border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="mp3" className="text-popover-foreground hover:bg-accent">MP3</SelectItem>
                            <SelectItem value="wav" className="text-popover-foreground hover:bg-accent">WAV</SelectItem>
                            <SelectItem value="m4a" className="text-popover-foreground hover:bg-accent">M4A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Background Ambient Sound */}
                      {/* <div className="space-y-2">
                        <Label htmlFor="backgroundAmbientSound" className="text-white">Background Ambient Sound</Label>
                        <Select 
                          value={formData.backgroundAmbientSound} 
                          onValueChange={(value) => handleInputChange("backgroundAmbientSound", value)}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue placeholder="Select ambient sound" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="none" className="text-white hover:bg-gray-700">None</SelectItem>
                            <SelectItem value="office" className="text-white hover:bg-gray-700">Office</SelectItem>
                            <SelectItem value="cafe" className="text-white hover:bg-gray-700">Café</SelectItem>
                            <SelectItem value="nature" className="text-white hover:bg-gray-700">Nature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}

                      {/* Remember Lead Preference */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="rememberLeadPreference" className="text-foreground">Remember lead preference across calls</Label>
                        <Switch
                          id="rememberLeadPreference"
                          checked={formData.rememberLeadPreference}
                          onCheckedChange={(checked) => handleInputChange("rememberLeadPreference", checked)}
                        />
                      </div>

                      {/* Voicemail Detection */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="voicemailDetection" className="text-foreground">Voicemail detection</Label>
                        <Switch
                          id="voicemailDetection"
                          checked={formData.voicemailDetection}
                          onCheckedChange={(checked) => handleInputChange("voicemailDetection", checked)}
                        />
                      </div>

                      {/* Call Transfer */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enableCallTransfer" className="text-foreground">Enable call transfer to human</Label>
                        <Switch
                          id="enableCallTransfer"
                          checked={formData.enableCallTransfer}
                          onCheckedChange={(checked) => handleInputChange("enableCallTransfer", checked)}
                        />
                      </div>

                      {/* Transfer Phone Number */}
                      {formData.enableCallTransfer && (
                        <div className="space-y-2">
                          <Label htmlFor="transferPhoneNumber" className="text-foreground">Transfer Phone Number</Label>
                          <Input
                            id="transferPhoneNumber"
                            type="tel"
                            value={formData.transferPhoneNumber}
                            onChange={(e) => handleInputChange("transferPhoneNumber", e.target.value)}
                            placeholder="Enter phone number (e.g., +1234567890)"
                            className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary"
                          />
                          <p className="text-xs text-muted-foreground">
                            Phone number to transfer calls to when user requests to speak with a human
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Voicemail Message */}
                    <div className="space-y-2">
                      <Label htmlFor="voicemailMessage" className="text-foreground">Voicemail Message</Label>
                      <Textarea
                        id="voicemailMessage"
                        value={formData.voicemailMessage}
                        onChange={(e) => handleInputChange("voicemailMessage", e.target.value)}
                        placeholder="Enter the message to leave when voicemail is detected..."
                        className="min-h-[280px] bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary resize-none"
                      />
                    </div>
                  </div>

                  {/* Model Settings Section */}
                  <div className="border-t border-border pt-6 mt-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Model Settings</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="temperature" className="text-foreground">Response Style</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-400 hover:text-[#3B82F6] cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Controls how creative or predictable your assistant's responses are.<br />
                              Conservative: More predictable, factual responses<br />
                              Creative: More varied, spontaneous responses</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="space-y-2">
                          <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            value={formData.temperature}
                            onChange={(e) => handleInputChange("temperature", e.target.value)}
                            placeholder="0.7"
                            min="0"
                            max="2"
                            className="bg-input border-border text-foreground focus:border-primary"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Conservative (0)</span>
                            <span>Balanced (1)</span>
                            <span>Creative (2)</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Controls response creativity and randomness
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Post Call Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Post Call Analysis (Transcriber)</CardTitle>
                  <CardDescription>
                    Configure tags that will be analyzed after each call to categorize and track call outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* User Generated Tags */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold text-[#3B82F6]">User Generated Tags</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add custom tags that you want to track. Press Enter to add each tag.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Input
                          placeholder="Type a tag and press Enter"
                          value={currentUserTag}
                          onChange={(e) => setCurrentUserTag(e.target.value)}
                          onKeyDown={handleAddUserTag}
                          className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-primary"
                        />

                        {formData.userTags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.userTags.map((tag, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] px-3 py-1 rounded-md text-sm"
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUserTag(tag)}
                                  className="text-[#3B82F6] hover:text-[#3B82F6]/80 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* System Generated Tags */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold text-[#3B82F6]">System Generated Tags</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select predefined system tags that will be automatically assigned based on call analysis.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Select
                          onValueChange={(value) => {
                            if (value && !formData.systemTags.includes(value)) {
                              handleInputChange("systemTags", [...formData.systemTags, value]);
                            }
                          }}
                        >
                          <SelectTrigger className="bg-input border-border text-foreground focus:border-primary">
                            <SelectValue placeholder="Choose tags to add..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {systemTagOptions
                              .filter(tag => !formData.systemTags.includes(tag))
                              .map((tag) => (
                                <SelectItem 
                                  key={tag} 
                                  value={tag}
                                  className="text-popover-foreground hover:bg-accent focus:bg-primary/20 focus:text-primary"
                                >
                                  {tag}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.systemTags.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-muted-foreground mb-2">Selected tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {formData.systemTags.map((tag, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-500 px-3 py-1 rounded-md text-sm"
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleInputChange("systemTags", formData.systemTags.filter(t => t !== tag))}
                                  className="text-green-500 hover:text-green-400 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4 mt-6">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="text-blue-400 font-medium mb-1">How Tags Work</p>
                          <p className="text-gray-300 text-xs leading-relaxed">
                            These tags will be included in outbound call requests and analyzed after each call. 
                            User tags help track custom metrics, while system tags provide automated call categorization 
                            based on call duration, outcome, and conversation analysis.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-border">
            <Button
              type="submit"
              disabled={isSubmitting || saveMutation.isPending || !isFormValid()}
              className="min-w-[120px] bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white border-0 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {saveMutation.isPending ? "Saving..." : "Training Knowledge Base..."}
                </>
              ) : selectedAssistant ? (
                "Update Assistant"
              ) : (
                "Create Assistant"
              )}
            </Button>
          </div>
        </form>
        </TooltipProvider>
      </div>
    </div>
  );
}