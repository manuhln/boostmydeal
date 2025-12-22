import { useState } from "react";
import { Search, FileText, Check, X, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowledgeBase, type KnowledgeBaseItem } from "@/hooks/useKnowledgeBase";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface KnowledgeBaseSelectorProps {
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  showUpload?: boolean; // Optional prop to show/hide upload functionality
}

export function KnowledgeBaseSelector({
  selectedItems,
  onSelectionChange,
  showUpload = false
}: KnowledgeBaseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: knowledgeData, isLoading, error } = useKnowledgeBase();
  
  console.log('KnowledgeBaseSelector - knowledgeData:', knowledgeData);
  console.log('KnowledgeBaseSelector - isLoading:', isLoading);
  console.log('KnowledgeBaseSelector - error:', error);
  
  const knowledgeBaseItems: KnowledgeBaseItem[] = knowledgeData?.data || [];

  // Upload mutation for new PDFs
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('pdfs', file);
      });

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      toast({
        title: "Success",
        description: `Successfully uploaded ${data.data?.length || 1} PDF(s) to Knowledge Base`,
      });
      
      // Auto-select newly uploaded items
      if (data.data && Array.isArray(data.data)) {
        const newItemIds = data.data.map((item: any) => item._id);
        onSelectionChange([...selectedItems, ...newItemIds]);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF files",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    uploadMutation.mutate(files);
  };
  
  const filteredItems = knowledgeBaseItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload New PDFs Section - Only show if showUpload is true */}
      {showUpload && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Upload New PDFs</h4>
          <div 
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isUploading 
                ? "border-[#3B82F6] bg-[#3B82F6]/10 cursor-not-allowed" 
                : "border-[#3B82F6]/50 cursor-pointer hover:border-[#3B82F6] hover:bg-[#3B82F6]/5"
            }`}
            onClick={() => {
              if (!isUploading) {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.pdf';
                fileInput.multiple = true;
                fileInput.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files);
                fileInput.click();
              }
            }}
          >
            <div className="space-y-2">
              <Upload className={`h-6 w-6 mx-auto ${isUploading ? "text-[#3B82F6] animate-pulse" : "text-[#3B82F6]"}`} />
              <div className="text-sm text-muted-foreground">
                {isUploading ? (
                  <p className="text-[#3B82F6] font-medium">Uploading and processing PDFs...</p>
                ) : (
                  <>
                    <p>Upload PDF files to generate knowledge base with AI</p>
                    <p className="text-xs">
                      Click to browse or drag and drop files
                    </p>
                    <p className="text-xs text-[#3B82F6] font-medium">
                      ✓ Multi-select supported • ✓ Auto-adds to selection
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Base Selection Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Select from Knowledge Base</h4>
          {!showUpload && (
            <p className="text-xs text-muted-foreground">
              To add new PDFs, use the Knowledge Base tab
            </p>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border text-foreground"
          />
        </div>

        {/* Knowledge Base Items */}
        <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-muted/20">
          {isLoading && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Loading knowledge base...
            </div>
          )}
          
          {!isLoading && filteredItems.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {knowledgeBaseItems.length === 0 
                ? "No documents in knowledge base yet" 
                : "No documents match your search"}
            </div>
          )}

          {filteredItems.map((item) => {
            const isSelected = selectedItems.includes(item._id);
            return (
              <div
                key={item._id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-muted-foreground hover:bg-muted/50"
                }`}
                onClick={() => toggleSelection(item._id)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  
                  <FileText className="h-4 w-4 text-[#3B82F6]" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{item.fileType}</span>
                      <span>•</span>
                      <span>{formatFileSize(item.fileSize)}</span>
                      {item.description && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{item.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Items Summary */}
        {selectedItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Selected from Knowledge Base ({selectedItems.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedItems.map((itemId) => {
                const item = knowledgeBaseItems.find(kb => kb._id === itemId);
                if (!item) return null;
                
                return (
                  <Badge 
                    key={itemId}
                    variant="secondary"
                    className="bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {item.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(itemId);
                      }}
                      className="ml-1 hover:bg-[#3B82F6]/30 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}