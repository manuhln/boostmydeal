import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function WebhookDebug() {
  const [callId, setCallId] = useState('');
  const [searchCallId, setSearchCallId] = useState('');

  // Query to get webhook data for a specific call
  const { data: webhookData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/calls', searchCallId, 'webhooks'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/calls/${searchCallId}/webhooks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!searchCallId,
    retry: false
  });

  const handleSearch = () => {
    if (callId.trim()) {
      setSearchCallId(callId.trim());
    }
  };

  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case 'PHONE_CALL_CONNECTED':
        return 'bg-green-500';
      case 'TRANSCRIPT_COMPLETE':
        return 'bg-blue-500';
      case 'PHONE_CALL_ENDED':
        return 'bg-red-500';
      case 'CALL_SUMMARY':
        return 'bg-yellow-500';
      case 'TWILIO_STATUS_UPDATE':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Webhook Debug Tool</h1>
        
        {/* Search Section */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Search Call Webhook Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter call_id from webhook (e.g., cVRzP8LQXUyk2a2o5fGTYA)"
                value={callId}
                onChange={(e) => setCallId(e.target.value)}
                className="bg-input border-border text-foreground flex-1"
              />
              <Button 
                onClick={handleSearch}
                className="bg-[#F74000] hover:bg-[#e63900] text-white"
                disabled={!callId.trim()}
              >
                Search
              </Button>
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              Use the call_id from your webhook payload or copy from Call Logs → Call ID column
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-foreground">Loading webhook data...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-destructive">Error loading webhook data. Please check the Call ID.</p>
            </CardContent>
          </Card>
        )}

        {/* Webhook Data Display */}
        {webhookData?.success && (
          <div className="space-y-6">
            {/* Call Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Call Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Call ID</p>
                    <p className="text-foreground font-mono text-sm">{webhookData.data.callId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Twilio SID</p>
                    <p className="text-foreground font-mono text-sm">{webhookData.data.twilioSid || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Status</p>
                    <Badge className="bg-primary text-primary-foreground">{webhookData.data.status}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Webhook Count</p>
                    <p className="text-foreground text-lg font-bold">{webhookData.data.webhookCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Webhooks List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Webhook Payload Array</CardTitle>
              </CardHeader>
              <CardContent>
                {webhookData.data.webhooks.length === 0 ? (
                  <p className="text-muted-foreground">No webhooks received yet for this call.</p>
                ) : (
                  <div className="space-y-4">
                    {webhookData.data.webhooks.map((webhook: any, index: number) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`${getWebhookTypeColor(webhook.type)} text-white`}>
                            {webhook.type}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            {new Date(webhook.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        <Separator className="border-border my-3" />
                        
                        <div className="bg-muted rounded p-3 overflow-x-auto">
                          <pre className="text-muted-foreground text-xs whitespace-pre-wrap">
                            {JSON.stringify(webhook.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-card border-border mt-8">
          <CardHeader>
            <CardTitle className="text-foreground">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground space-y-2">
              <p>1. Make a call using your system</p>
              <p>2. Copy the Call ID from the Call Logs page</p>
              <p>3. Paste it in the search box above and click Search</p>
              <p>4. View all webhook payloads received for that call</p>
              <p className="text-primary mt-4">
                💡 Tip: You can also use the Twilio SID if available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}