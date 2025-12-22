import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Mic, Trash2, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VoiceCloningProps {
  integrationId: string;
  integrationName: string;
}

interface ClonedVoice {
  voice_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export function VoiceCloning({ integrationId, integrationName }: VoiceCloningProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cloned voices
  const { data: clonedVoices, isLoading } = useQuery({
    queryKey: [`/api/integrations/elevenlabs/${integrationId}/cloned-voices`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/integrations/elevenlabs/${integrationId}/cloned-voices`);
      return response.data as ClonedVoice[];
    }
  });

  // Clone voice mutation
  const cloneVoiceMutation = useMutation({
    mutationFn: async (data: { audioFile: File; voiceName: string; voiceDescription: string }) => {
      const formData = new FormData();
      formData.append('audioFile', data.audioFile);
      formData.append('voiceName', data.voiceName);
      formData.append('voiceDescription', data.voiceDescription);

      const response = await fetch(`/api/integrations/elevenlabs/${integrationId}/clone-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clone voice');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Voice "${voiceName}" cloned successfully!`
      });
      // Reset form
      setAudioFile(null);
      setVoiceName('');
      setVoiceDescription('');
      // Refresh the voices list
      queryClient.invalidateQueries({ queryKey: [`/api/integrations/elevenlabs/${integrationId}/cloned-voices`] });
      // Also refresh the main voices list to include the new cloned voice
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/voices'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete voice mutation
  const deleteVoiceMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      return await apiRequest('DELETE', `/api/integrations/elevenlabs/${integrationId}/cloned-voices/${voiceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Voice deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/integrations/elevenlabs/${integrationId}/cloned-voices`] });
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/voices'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an audio file (MP3, WAV, etc.)",
          variant: "destructive"
        });
        return;
      }

      // Check file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Audio file must be smaller than 25MB",
          variant: "destructive"
        });
        return;
      }

      setAudioFile(file);
    }
  };

  const handleCloneVoice = () => {
    if (!audioFile) {
      toast({
        title: "No audio file",
        description: "Please select an audio file to clone",
        variant: "destructive"
      });
      return;
    }

    if (!voiceName.trim()) {
      toast({
        title: "Voice name required",
        description: "Please enter a name for your cloned voice",
        variant: "destructive"
      });
      return;
    }

    cloneVoiceMutation.mutate({
      audioFile,
      voiceName: voiceName.trim(),
      voiceDescription: voiceDescription.trim()
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload New Voice */}
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            <Mic className="w-5 h-5 mr-2 text-[#F74000]" />
            Clone New Voice - {integrationName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="voiceFile" className="text-foreground">Audio File</Label>
            <div className="mt-2">
              <Input
                id="voiceFile"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="bg-background border-border text-foreground"
              />
              {audioFile && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(audioFile.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAudioFile(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              Upload clear audio (MP3, WAV, etc.) at least 30 seconds long. Max 25MB.
            </p>
          </div>

          <div>
            <Label htmlFor="cloneVoiceName" className="text-foreground">Voice Name</Label>
            <Input
              id="cloneVoiceName"
              placeholder="e.g., CEO Voice, Customer Service Voice"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <Label htmlFor="cloneVoiceDescription" className="text-foreground">Description (Optional)</Label>
            <Textarea
              id="cloneVoiceDescription"
              placeholder="Describe the voice characteristics or use case"
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
          </div>

          <Button
            onClick={handleCloneVoice}
            disabled={!audioFile || !voiceName.trim() || cloneVoiceMutation.isPending}
            className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            {cloneVoiceMutation.isPending ? 'Cloning Voice...' : 'Clone Voice'}
          </Button>
        </CardContent>
      </Card>

      {/* Cloned Voices List */}
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Your Cloned Voices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading cloned voices...</div>
          ) : clonedVoices && clonedVoices.length > 0 ? (
            <div className="space-y-3">
              {clonedVoices.map((voice) => (
                <div
                  key={voice.voice_id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{voice.name}</h4>
                    {voice.description && (
                      <p className="text-sm text-muted-foreground mt-1">{voice.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(voice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVoiceMutation.mutate(voice.voice_id)}
                      disabled={deleteVoiceMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No cloned voices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload an audio file above to create your first cloned voice
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}