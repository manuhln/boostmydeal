import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Plus, Settings, Trash2, TestTube, CheckCircle, AlertCircle, Database, Webhook, Copy, Mic } from "lucide-react";
import { VoiceCloning } from "@/components/VoiceCloning";

interface Integration {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  email: string;
  password: string;
}

interface HubSpotConfig {
  apiKey: string;
  baseUrl?: string;
}

interface ZohoConfig {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
  region?: string;
  baseUrl?: string;
}

interface WebhookConfig {
  username: string;
  password: string;
}

interface ElevenLabsConfig {
  apiKey: string;
  voiceName: string;
  voiceDescription?: string;
}

export default function Integrations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [getDealDialog, setGetDealDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<string>("SMTP");
  const [smtpFormData, setSMTPFormData] = useState<SMTPConfig>({
    host: "",
    port: 587,
    secure: false,
    email: "",
    password: ""
  });
  const [hubspotFormData, setHubSpotFormData] = useState<HubSpotConfig>({
    apiKey: "",
    baseUrl: ""
  });
  const [zohoFormData, setZohoFormData] = useState<ZohoConfig>({
    refreshToken: "",
    clientId: "",
    clientSecret: "",
    region: "com",
    baseUrl: ""
  });
  const [webhookFormData, setWebhookFormData] = useState<WebhookConfig>({
    username: "",
    password: ""
  });
  const [elevenLabsFormData, setElevenLabsFormData] = useState<ElevenLabsConfig>({
    apiKey: "",
    voiceName: "",
    voiceDescription: ""
  });
  const [configName, setConfigName] = useState("");
  const [testEmail, setTestEmail] = useState({
    to: "",
    subject: "Test Email from Integration",
    message: "This is a test email to verify your SMTP configuration is working correctly."
  });
  const [getDealForm, setGetDealForm] = useState({
    dealName: ""
  });
  const [dealResults, setDealResults] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ["/api/integrations"],
  });

  // Fetch supported types
  const { data: typesData } = useQuery({
    queryKey: ["/api/integrations/types"],
  });

  const integrations = (integrationsData as any)?.data || [];
  const supportedTypes = (typesData as any)?.data || [];

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; config: SMTPConfig | HubSpotConfig | ZohoConfig | WebhookConfig | ElevenLabsConfig }) => {
      return await apiRequest("POST", "/api/integrations/config", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Integration saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Test configuration mutation
  const testConfigMutation = useMutation({
    mutationFn: async (data: { type: string; config: SMTPConfig | HubSpotConfig | ZohoConfig | WebhookConfig | ElevenLabsConfig }) => {
      return await apiRequest("POST", "/api/integrations/test", data);
    },
    onSuccess: (data) => {
      if (data.data?.isValid) {
        toast({ title: "Success", description: "Configuration is valid!" });
      } else {
        toast({ title: "Error", description: "Configuration test failed", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Send test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: { configId: string; to: string; subject: string; message: string }) => {
      return await apiRequest("POST", `/api/integrations/${data.configId}/test-email`, {
        to: data.to,
        subject: data.subject,
        message: data.message
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Test email sent successfully!" });
      setTestEmailDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Get CRM deal mutation (supports HubSpot and Zoho)
  const getCRMDealMutation = useMutation({
    mutationFn: async (data: { configId: string; dealName: string }) => {
      return await apiRequest("POST", `/api/integrations/${data.configId}/get-deal`, {
        dealName: data.dealName
      });
    },
    onSuccess: (data) => {
      setDealResults(data.data);
      toast({ 
        title: "Success", 
        description: `Found ${data.data.count} deal(s) with name "${data.data.dealName}"` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (configId: string) => {
      return await apiRequest("DELETE", `/api/integrations/${configId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Integration deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setSMTPFormData({
      host: "",
      port: 587,
      secure: false,
      email: "",
      password: ""
    });
    setHubSpotFormData({
      apiKey: "",
      baseUrl: ""
    });
    setZohoFormData({
      refreshToken: "",
      clientId: "",
      clientSecret: "",
      region: "com",
      baseUrl: ""
    });
    setWebhookFormData({
      username: "",
      password: ""
    });
    setElevenLabsFormData({
      apiKey: "",
      voiceName: "",
      voiceDescription: ""
    });
    setConfigName("");
    // Don't reset selectedIntegrationType here as it should be set by the button click
  };

  const handleSave = () => {
    if (!configName.trim()) {
      toast({ title: "Error", description: "Please enter a configuration name", variant: "destructive" });
      return;
    }
    
    let configData: any;
    
    if (selectedIntegrationType === "SMTP") {
      configData = smtpFormData;
    } else if (selectedIntegrationType === "HUBSPOT") {
      // Encode API key for HubSpot to prevent it from being visible in network requests
      configData = {
        ...hubspotFormData,
        apiKey: `encoded_${btoa(hubspotFormData.apiKey)}`, // Base64 encode for transport
        baseUrl: hubspotFormData.baseUrl || undefined // Remove empty baseUrl to prevent validation errors
      };
    } else if (selectedIntegrationType === "ZOHO") {
      // Encode all Zoho credentials to prevent them from being visible in network requests
      configData = {
        ...zohoFormData,
        refreshToken: zohoFormData.refreshToken ? `encoded_${btoa(zohoFormData.refreshToken)}` : undefined,
        clientId: zohoFormData.clientId ? `encoded_${btoa(zohoFormData.clientId)}` : undefined,
        clientSecret: zohoFormData.clientSecret ? `encoded_${btoa(zohoFormData.clientSecret)}` : undefined,
        baseUrl: zohoFormData.baseUrl || undefined // Remove empty baseUrl to prevent validation errors
      };
    } else if (selectedIntegrationType === "WEBHOOK") {
      // Encode webhook credentials for security
      configData = {
        ...webhookFormData,
        username: `encoded_${btoa(webhookFormData.username)}`,
        password: `encoded_${btoa(webhookFormData.password)}`
      };
    } else if (selectedIntegrationType === "ELEVENLABS") {
      // Encode ElevenLabs API key for security
      configData = {
        ...elevenLabsFormData,
        apiKey: `encoded_${btoa(elevenLabsFormData.apiKey)}`
      };
    }
    
    saveConfigMutation.mutate({
      type: selectedIntegrationType,
      name: configName,
      config: configData
    });
  };

  const handleTest = () => {
    let configData: any;
    
    if (selectedIntegrationType === "SMTP") {
      configData = smtpFormData;
    } else if (selectedIntegrationType === "HUBSPOT") {
      // Encode API key for HubSpot to prevent it from being visible in network requests
      configData = {
        ...hubspotFormData,
        apiKey: `encoded_${btoa(hubspotFormData.apiKey)}` // Base64 encode for transport
      };
    } else if (selectedIntegrationType === "ZOHO") {
      // Encode all Zoho credentials to prevent them from being visible in network requests
      configData = {
        ...zohoFormData,
        refreshToken: zohoFormData.refreshToken ? `encoded_${btoa(zohoFormData.refreshToken)}` : undefined,
        clientId: zohoFormData.clientId ? `encoded_${btoa(zohoFormData.clientId)}` : undefined,
        clientSecret: zohoFormData.clientSecret ? `encoded_${btoa(zohoFormData.clientSecret)}` : undefined
      };
    } else if (selectedIntegrationType === "WEBHOOK") {
      configData = webhookFormData;
    } else if (selectedIntegrationType === "ELEVENLABS") {
      // Encode ElevenLabs API key for testing
      configData = {
        ...elevenLabsFormData,
        apiKey: `encoded_${btoa(elevenLabsFormData.apiKey)}`
      };
    }
    
    testConfigMutation.mutate({
      type: selectedIntegrationType,
      config: configData
    });
  };

  const handleSendTestEmail = () => {
    if (!testEmail.to || !selectedConfig) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    testEmailMutation.mutate({
      configId: selectedConfig,
      ...testEmail
    });
  };

  const handleGetDeal = () => {
    if (!getDealForm.dealName || !selectedConfig) {
      toast({ title: "Error", description: "Please enter a deal name", variant: "destructive" });
      return;
    }

    getCRMDealMutation.mutate({
      configId: selectedConfig,
      dealName: getDealForm.dealName
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 bg-background min-h-screen">
          <div className="text-foreground">Loading integrations...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <header className="bg-background border-b border-border px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Connect your favorite tools and services to enhance your workflow
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-background min-h-screen">

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-[95vw] max-w-lg mx-auto bg-background border-border max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-foreground text-lg">Add Integration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto flex-1 px-1 mt-4">
                <div>
                  <Label htmlFor="integrationType" className="text-foreground">Integration Type</Label>
                  <Select value={selectedIntegrationType} onValueChange={setSelectedIntegrationType}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Select integration type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="SMTP" className="text-foreground hover:bg-accent">Email</SelectItem>
                      <SelectItem value="HUBSPOT" className="text-foreground hover:bg-accent">HubSpot CRM</SelectItem>
                      <SelectItem value="ZOHO" className="text-foreground hover:bg-accent">Zoho CRM</SelectItem>
                      <SelectItem value="WEBHOOK" className="text-foreground hover:bg-accent">Custom Webhook</SelectItem>
                      <SelectItem value="ELEVENLABS" className="text-foreground hover:bg-accent">ElevenLabs Voice Cloning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="configName" className="text-foreground">Configuration Name</Label>
                  <Input
                    id="configName"
                    placeholder={selectedIntegrationType === "SMTP" ? "e.g., Gmail SMTP" : "e.g., Production HubSpot"}
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                
                {/* SMTP Configuration Form */}
                {selectedIntegrationType === "SMTP" && (
                  <>
                    <div>
                      <Label htmlFor="host" className="text-foreground">SMTP Host</Label>
                      <Input
                        id="host"
                        placeholder="smtp.gmail.com"
                        value={smtpFormData.host}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, host: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="port" className="text-foreground">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={smtpFormData.port}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, port: parseInt(e.target.value) || 587 })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="secure"
                        checked={smtpFormData.secure}
                        onCheckedChange={(checked) => setSMTPFormData({ ...smtpFormData, secure: checked })}
                        className="data-[state=checked]:bg-[#F74000]"
                      />
                      <Label htmlFor="secure" className="text-foreground">Use SSL/TLS</Label>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-foreground">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={smtpFormData.email}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, email: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-foreground">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Your email password or app password"
                        value={smtpFormData.password}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, password: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </>
                )}

                {/* HubSpot Configuration Form */}
                {selectedIntegrationType === "HUBSPOT" && (
                  <>
                    <div>
                      <Label htmlFor="apiKey" className="text-foreground">HubSpot API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Your HubSpot API key"
                        value={hubspotFormData.apiKey}
                        onChange={(e) => setHubSpotFormData({ ...hubspotFormData, apiKey: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Find your API key in HubSpot Settings → Account Setup → Integrations → API Key
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="baseUrl" className="text-foreground">Base URL (Optional)</Label>
                      <Input
                        id="baseUrl"
                        placeholder="https://api.hubapi.com"
                        value={hubspotFormData.baseUrl}
                        onChange={(e) => setHubSpotFormData({ ...hubspotFormData, baseUrl: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Leave empty to use the default HubSpot API URL
                      </p>
                    </div>
                  </>
                )}

                {/* Zoho Configuration Form */}
                {selectedIntegrationType === "ZOHO" && (
                  <>
                    <div>
                      <Label htmlFor="clientId" className="text-foreground">Zoho Client ID</Label>
                      <Input
                        id="clientId"
                        type="text"
                        placeholder="Your Zoho app client ID"
                        value={zohoFormData.clientId || ''}
                        onChange={(e) => setZohoFormData({ ...zohoFormData, clientId: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Client ID from your Zoho CRM app in API Console
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="clientSecret" className="text-foreground">Zoho Client Secret</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        placeholder="Your Zoho app client secret"
                        value={zohoFormData.clientSecret || ''}
                        onChange={(e) => setZohoFormData({ ...zohoFormData, clientSecret: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Client Secret from your Zoho CRM app in API Console
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="refreshToken" className="text-foreground">Zoho Refresh Token</Label>
                      <Input
                        id="refreshToken"
                        type="password"
                        placeholder="Your Zoho refresh token"
                        value={zohoFormData.refreshToken}
                        onChange={(e) => setZohoFormData({ ...zohoFormData, refreshToken: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Generate a refresh token from your Zoho CRM app settings
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="region" className="text-foreground">Region</Label>
                      <Select value={zohoFormData.region} onValueChange={(value) => setZohoFormData({ ...zohoFormData, region: value })}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select your Zoho region" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="com" className="text-foreground hover:bg-gray-800">United States (.com)</SelectItem>
                          <SelectItem value="eu" className="text-foreground hover:bg-gray-800">Europe (.eu)</SelectItem>
                          <SelectItem value="in" className="text-foreground hover:bg-gray-800">India (.in)</SelectItem>
                          <SelectItem value="au" className="text-foreground hover:bg-gray-800">Australia (.au)</SelectItem>
                          <SelectItem value="jp" className="text-foreground hover:bg-gray-800">Japan (.jp)</SelectItem>
                          <SelectItem value="ca" className="text-foreground hover:bg-gray-800">Canada (.ca)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-muted-foreground text-xs mt-1">
                        Select the region where your Zoho CRM account is hosted
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="baseUrl" className="text-foreground">Base URL (Optional)</Label>
                      <Input
                        id="baseUrl"
                        placeholder="https://crm.zoho.com"
                        value={zohoFormData.baseUrl}
                        onChange={(e) => setZohoFormData({ ...zohoFormData, baseUrl: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Leave empty to use the default Zoho CRM API URL
                      </p>
                    </div>
                  </>
                )}
                
                {/* Webhook Configuration Form */}
                {selectedIntegrationType === "WEBHOOK" && (
                  <>
                    <div>
                      <Label htmlFor="webhookUsername" className="text-foreground">Username</Label>
                      <Input
                        id="webhookUsername"
                        placeholder="Enter webhook username"
                        value={webhookFormData.username}
                        onChange={(e) => setWebhookFormData({ ...webhookFormData, username: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        This will be used for Basic Auth authentication
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="webhookPassword" className="text-foreground">Password</Label>
                      <Input
                        id="webhookPassword"
                        type="password"
                        placeholder="Enter webhook password"
                        value={webhookFormData.password}
                        onChange={(e) => setWebhookFormData({ ...webhookFormData, password: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Strong password recommended for security
                      </p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-foreground font-medium">Webhook Endpoint URL</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `https://boostmylead.xoidlabs.com/api/webhook/calls`;
                            navigator.clipboard.writeText(url);
                            toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
                          }}
                          className="border-border text-foreground hover:bg-gray-800"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <code className="text-sm text-gray-300 bg-gray-800 p-2 rounded block break-all">
                        https://boostmylead.xoidlabs.com/api/webhook/calls
                      </code>
                      <p className="text-muted-foreground text-xs mt-2">
                        Use this URL in external platforms like Zapier, Make, HubSpot, Salesforce, etc.
                      </p>
                    </div>
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                      <h4 className="text-blue-300 font-medium mb-2">Usage Instructions:</h4>
                      <ul className="text-blue-200 text-sm space-y-1">
                        <li>• Use HTTP Basic Auth with your username and password</li>
                        <li>• Make GET requests to retrieve call data in JSON format</li>
                        <li>• Supports query filters: ?limit=10&offset=0&status=completed</li>
                        <li>• Returns results with call details and metadata</li>
                      </ul>
                    </div>
                  </>
                )}

                {/* ElevenLabs Configuration Form */}
                {selectedIntegrationType === "ELEVENLABS" && (
                  <>
                    <div>
                      <Label htmlFor="apiKey" className="text-foreground">ElevenLabs API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your ElevenLabs API key"
                        value={elevenLabsFormData.apiKey}
                        onChange={(e) => setElevenLabsFormData({ ...elevenLabsFormData, apiKey: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        Get your API key from the ElevenLabs dashboard
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="voiceName" className="text-foreground">Default Voice Name</Label>
                      <Input
                        id="voiceName"
                        placeholder="e.g., My Custom Voice"
                        value={elevenLabsFormData.voiceName}
                        onChange={(e) => setElevenLabsFormData({ ...elevenLabsFormData, voiceName: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-muted-foreground text-xs mt-1">
                        A name for your voice cloning integration
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="voiceDescription" className="text-foreground">Description (Optional)</Label>
                      <Textarea
                        id="voiceDescription"
                        placeholder="Describe the purpose or characteristics of this voice integration"
                        value={elevenLabsFormData.voiceDescription}
                        onChange={(e) => setElevenLabsFormData({ ...elevenLabsFormData, voiceDescription: e.target.value })}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                        rows={3}
                      />
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                      <h4 className="text-yellow-300 font-medium mb-2">Voice Cloning Instructions:</h4>
                      <ul className="text-yellow-200 text-sm space-y-1">
                        <li>• After setup, you can upload audio files to clone voices</li>
                        <li>• Audio files should be clear and at least 30 seconds long</li>
                        <li>• Cloned voices will appear in your agent TTS settings</li>
                        <li>• Supports MP3, WAV, and other common audio formats</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-800">
                {selectedIntegrationType !== "WEBHOOK" && (
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testConfigMutation.isPending}
                    className="border-border text-foreground hover:bg-gray-800 w-full sm:w-auto"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Test
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saveConfigMutation.isPending}
                  className="flex-1 bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0 w-full sm:w-auto"
                >
                  {selectedIntegrationType === "WEBHOOK" ? "Create Webhook" : "Save Configuration"}
                </Button>
              </div>
            </DialogContent>
        </Dialog>

        {/* Main Content - Available Integrations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-background border-gray-800 hover:border-[#F74000]/50 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F74000]/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#F74000]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold">Email</h3>
                  <p className="text-muted-foreground text-sm">Send emails using SMTP configuration</p>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
                  onClick={() => {
                    resetForm();
                    setSelectedIntegrationType("SMTP");
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add SMTP Integration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-gray-800 hover:border-[#F74000]/50 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F74000]/10 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-[#F74000]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold">HubSpot CRM</h3>
                  <p className="text-muted-foreground text-sm">Get, create and update deals</p>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
                  onClick={() => {
                    resetForm();
                    setSelectedIntegrationType("HUBSPOT");
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add HubSpot Integration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-gray-800 hover:border-[#F74000]/50 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F74000]/10 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-[#F74000]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold">Zoho CRM</h3>
                  <p className="text-muted-foreground text-sm">Connect with Zoho CRM for deal management</p>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
                  onClick={() => {
                    resetForm();
                    setSelectedIntegrationType("ZOHO");
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Zoho Integration
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-gray-800 hover:border-[#F74000]/50 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F74000]/10 rounded-lg flex items-center justify-center">
                  <Webhook className="w-6 h-6 text-[#F74000]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold">Custom Webhook</h3>
                  <p className="text-muted-foreground text-sm">Secure webhook endpoint for external platforms</p>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
                  onClick={() => {
                    resetForm();
                    setSelectedIntegrationType("WEBHOOK");
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Setup Custom Webhook
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-gray-800 hover:border-[#F74000]/50 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#F74000]/10 rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-[#F74000]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-semibold">ElevenLabs Voice Cloning</h3>
                  <p className="text-muted-foreground text-sm">Clone custom voices for your AI agents</p>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
                  onClick={() => {
                    resetForm();
                    setSelectedIntegrationType("ELEVENLABS");
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add ElevenLabs Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Existing Integrations List (if any) */}
        {integrations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Integrations</h2>
            <div className="grid gap-4">
              {integrations.map((integration: Integration) => (
                <Card key={integration.id} className="bg-background border-gray-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {integration.type === 'SMTP' ? (
                          <Mail className="w-5 h-5 text-[#F74000]" />
                        ) : integration.type === 'HUBSPOT' ? (
                          <Database className="w-5 h-5 text-[#F74000]" />
                        ) : integration.type === 'ZOHO' ? (
                          <Database className="w-5 h-5 text-[#F74000]" />
                        ) : integration.type === 'WEBHOOK' ? (
                          <Webhook className="w-5 h-5 text-[#F74000]" />
                        ) : integration.type === 'ELEVENLABS' ? (
                          <Mic className="w-5 h-5 text-[#F74000]" />
                        ) : (
                          <Settings className="w-5 h-5 text-[#F74000]" />
                        )}
                        <div>
                          <CardTitle className="text-lg text-foreground">{integration.name}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="bg-[#F74000]/20 text-[#F74000] border-[#F74000]/30">
                              {integration.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Created {new Date(integration.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {integration.type === 'SMTP' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedConfig(integration.id);
                              setTestEmailDialog(true);
                            }}
                            className="border-border text-foreground hover:bg-gray-800"
                          >
                            <TestTube className="w-4 h-4 mr-2" />
                            Test
                          </Button>
                        )}
                        {(integration.type === 'HUBSPOT' || integration.type === 'ZOHO') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedConfig(integration.id);
                              setGetDealDialog(true);
                              setDealResults(null);
                            }}
                            className="border-border text-foreground hover:bg-gray-800"
                          >
                            <Database className="w-4 h-4 mr-2" />
                            Get Deal
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                          disabled={deleteIntegrationMutation.isPending}
                          className="border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {integration.type === 'ELEVENLABS' && (
                    <CardContent>
                      <VoiceCloning 
                        integrationId={integration.id} 
                        integrationName={integration.name}
                      />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Test Email Dialog */}
        <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
          <DialogContent className="bg-black border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-foreground">Send Test Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="testTo" className="text-foreground">To</Label>
                <Input
                  id="testTo"
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail.to}
                  onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="testSubject" className="text-foreground">Subject</Label>
                <Input
                  id="testSubject"
                  value={testEmail.subject}
                  onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="testMessage" className="text-foreground">Message</Label>
                <Textarea
                  id="testMessage"
                  value={testEmail.message}
                  onChange={(e) => setTestEmail({ ...testEmail, message: e.target.value })}
                  rows={4}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button
                onClick={handleSendTestEmail}
                disabled={testEmailMutation.isPending}
                className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
              >
                Send Test Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Get Deal Dialog */}
        <Dialog open={getDealDialog} onOpenChange={setGetDealDialog}>
          <DialogContent className="bg-black border-gray-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Get CRM Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dealName" className="text-foreground">Deal Name</Label>
                <Input
                  id="dealName"
                  placeholder="Enter deal name to search"
                  value={getDealForm.dealName}
                  onChange={(e) => setGetDealForm({ dealName: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button
                onClick={handleGetDeal}
                disabled={getCRMDealMutation.isPending}
                className="w-full bg-[#F74000] hover:bg-[#F74000]/90 text-foreground border-0"
              >
                {getCRMDealMutation.isPending ? "Searching..." : "Get Deal"}
              </Button>
              
              {/* Results Display */}
              {dealResults && (
                <div className="mt-6 space-y-4">
                  <div className="border-t border-gray-800 pt-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Search Results for "{dealResults.dealName}"
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Found {dealResults.count} deal(s)
                    </p>
                    
                    {dealResults.deals && dealResults.deals.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {dealResults.deals.map((deal: any, index: number) => {
                          // Handle both HubSpot and Zoho deal formats
                          const isHubSpot = !!deal.properties;
                          const isZoho = !!deal.Deal_Name;
                          
                          const dealName = isHubSpot 
                            ? deal.properties?.dealname 
                            : isZoho 
                              ? deal.Deal_Name 
                              : deal.name || 'Unnamed Deal';
                          
                          const dealStage = isHubSpot 
                            ? deal.properties?.dealstage 
                            : isZoho 
                              ? deal.Stage 
                              : deal.stage || 'Unknown Stage';
                          
                          const dealAmount = isHubSpot 
                            ? deal.properties?.amount 
                            : isZoho 
                              ? deal.Amount 
                              : deal.amount;
                          
                          const closeDate = isHubSpot 
                            ? deal.properties?.closedate 
                            : isZoho 
                              ? deal.Closing_Date 
                              : deal.closeDate;
                          
                          const ownerId = isHubSpot 
                            ? deal.properties?.hubspot_owner_id 
                            : isZoho 
                              ? deal.Owner?.id 
                              : deal.ownerId;

                          return (
                            <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-foreground">{dealName}</h4>
                                <Badge variant="secondary" className="bg-[#F74000]/20 text-[#F74000] border-[#F74000]/30">
                                  {dealStage}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {dealAmount && (
                                  <p><span className="text-foreground">Amount:</span> ${dealAmount}</p>
                                )}
                                {closeDate && (
                                  <p><span className="text-foreground">Close Date:</span> {new Date(closeDate).toLocaleDateString()}</p>
                                )}
                                {ownerId && (
                                  <p><span className="text-foreground">Owner ID:</span> {ownerId}</p>
                                )}
                                {deal.id && (
                                  <p><span className="text-foreground">Deal ID:</span> {deal.id}</p>
                                )}
                                {isZoho && deal.Account_Name && (
                                  <p><span className="text-foreground">Account:</span> {deal.Account_Name.name || deal.Account_Name}</p>
                                )}
                                {isZoho && deal.Contact_Name && (
                                  <p><span className="text-foreground">Contact:</span> {deal.Contact_Name.name || deal.Contact_Name}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No deals found with that name</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}