import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProviders, useValidateProvider } from "@/hooks/useProviders";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Settings, RefreshCw, Key } from "lucide-react";

export default function ProviderSettings() {
  const { toast } = useToast();
  const { data: providersResponse, isLoading, refetch } = useProviders();
  const providers = providersResponse?.data || [];
  const validateProvider = useValidateProvider();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const handleValidateProvider = async (providerType: string) => {
    setTestingProvider(providerType);
    try {
      await validateProvider.mutateAsync(providerType);
      toast({
        title: "Validation Complete",
        description: `${providerType.toUpperCase()} provider validated successfully`,
      });
      await refetch();
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: `Failed to validate ${providerType.toUpperCase()} provider`,
        variant: "destructive",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const getProviderIcon = (provider: any) => {
    if (provider.isValidated) {
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    } else if (provider.isConfigured) {
      return <RefreshCw className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getProviderStatus = (provider: any) => {
    if (provider.isValidated) {
      return <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>;
    } else if (provider.isConfigured) {
      return <Badge className="bg-yellow-100 text-yellow-800">Configured</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Not Configured</Badge>;
    }
  };

  const getRequiredEnvVar = (providerType: string) => {
    switch (providerType) {
      case 'vapi':
        return 'VAPI_API_KEY';
      case 'elevenlabs':
        return 'ELEVENLABS_API_KEY';
      case 'openai':
        return 'OPENAI_API_KEY';
      case 'azure':
        return 'AZURE_SPEECH_KEY';
      default:
        return 'API_KEY';
    }
  };

  return (
    <Layout>
      <header className="bg-white dark:bg-card border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Provider Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure and manage your voice AI service providers
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </header>

      <div className="flex-1 p-8">
        <div className="grid gap-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">Loading provider status...</div>
              </CardContent>
            </Card>
          ) : !providers?.length ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">No providers found</div>
              </CardContent>
            </Card>
          ) : (
            providers.map((provider) => (
              <Card key={provider.type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getProviderIcon(provider)}
                      <div>
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Voice AI provider for call automation
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getProviderStatus(provider)}
                      {provider.isConfigured && (
                        <Button
                          onClick={() => handleValidateProvider(provider.type)}
                          disabled={testingProvider === provider.type}
                          size="sm"
                          variant="outline"
                        >
                          {testingProvider === provider.type ? (
                            <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Settings className="mr-2 h-3 w-3" />
                          )}
                          Test Connection
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <div className="mt-1">
                          {provider.isValidated ? (
                            <div className="text-sm text-emerald-600">
                              ✓ Connected and validated
                            </div>
                          ) : provider.isConfigured ? (
                            <div className="text-sm text-yellow-600">
                              ⚠ Configured but not tested
                            </div>
                          ) : (
                            <div className="text-sm text-red-600">
                              ✗ API key not configured
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Required Environment Variable</Label>
                        <div className="mt-1 flex items-center space-x-2">
                          <Key className="h-3 w-3 text-muted-foreground" />
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {getRequiredEnvVar(provider.type)}
                          </code>
                        </div>
                      </div>
                    </div>

                    {!provider.isConfigured && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                          Configuration Required
                        </h4>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                          To use {provider.name}, add your API key to the environment variables:
                        </p>
                        <code className="text-xs bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 rounded block">
                          {getRequiredEnvVar(provider.type)}=your_api_key_here
                        </code>
                      </div>
                    )}

                    {provider.type === 'vapi' && provider.isValidated && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                          VAPI Integration Active
                        </h4>
                        <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                          <li>• Agents automatically sync with VAPI when created/updated</li>
                          <li>• Calls are initiated through VAPI's voice AI engine</li>
                          <li>• Real-time call status and transcript updates</li>
                          <li>• Cost and usage tracking</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Integration Overview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Provider Integration Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">How the Provider Wrapper Works:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>
                    <strong>1. Abstraction Layer:</strong> The BaseVoiceProvider class provides a consistent interface across all voice providers
                  </li>
                  <li>
                    <strong>2. Provider Factory:</strong> Automatically selects the appropriate provider based on configuration
                  </li>
                  <li>
                    <strong>3. Agent Sync:</strong> Local agents are automatically synchronized with the voice provider's platform
                  </li>
                  <li>
                    <strong>4. Call Management:</strong> Calls are initiated through the provider's API with consistent response handling
                  </li>
                  <li>
                    <strong>5. Status Tracking:</strong> Real-time call status updates and transcript retrieval from providers
                  </li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Extensible Design:</strong> Adding new providers (like ElevenLabs, OpenAI, or Azure) only requires implementing the BaseVoiceProvider interface. 
                  The application automatically detects configured providers and handles provider-specific logic internally.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}