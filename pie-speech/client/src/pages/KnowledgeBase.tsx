import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Search, Upload, FileText, Trash2, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useKnowledgeBase, useCreateKnowledgeBase, useDeleteKnowledgeBase, type KnowledgeBaseItem } from "@/hooks/useKnowledgeBase";

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    websiteUrl: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: knowledgeData, isLoading, error } = useKnowledgeBase();
  const createKnowledgeBase = useCreateKnowledgeBase();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  console.log('KnowledgeBase - knowledgeData:', knowledgeData);
  console.log('KnowledgeBase - isLoading:', isLoading);
  console.log('KnowledgeBase - error:', error);

  const knowledgeBaseData: KnowledgeBaseItem[] = knowledgeData?.data || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the knowledge base item",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile && !formData.websiteUrl) {
      toast({
        title: "File or URL Required",
        description: "Please upload a PDF or provide a website URL",
        variant: "destructive",
      });
      return;
    }

    try {
      await createKnowledgeBase.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        websiteUrl: formData.websiteUrl || undefined,
        file: selectedFile || undefined,
      });

      // Reset form
      setFormData({ name: "", description: "", websiteUrl: "" });
      setSelectedFile(null);

      toast({
        title: "Success",
        description: "Knowledge base item created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create knowledge base item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKnowledgeBase.mutateAsync(id);
      toast({
        title: "Success",
        description: "Knowledge base item deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete knowledge base item",
        variant: "destructive",
      });
    }
  };

  const filteredData = knowledgeBaseData.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="flex h-full bg-background text-foreground">
        {/* Left Panel - Add Knowledge Base Form */}
        <div className="w-96 bg-background border-r border-border p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-foreground">Add Knowledge Base</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground hover:text-[#3B82F6] cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3 bg-background border border-border text-foreground">
                    <div className="text-sm">
                      <p className="font-medium mb-1">Knowledge Base</p>
                      <p>Upload PDF documents to create a knowledge base that your AI agents can access during calls. This allows agents to provide accurate, document-specific information and answer questions based on your company's materials, policies, or product information.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <Label className="text-[#3B82F6] text-sm font-medium mb-2 block">Name</Label>
              <Input
                placeholder="Document Name"
                className="bg-background border-border text-foreground placeholder-muted-foreground"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Description Field */}
            <div>
              <Label className="text-[#3B82F6] text-sm font-medium mb-2 block">Description</Label>
              <Textarea
                rows={4}
                className="bg-background border-border text-foreground placeholder-muted-foreground resize-none"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Upload Document Section */}
            <div>
              <Label className="text-[#3B82F6] text-sm font-medium mb-2 block">Upload Document</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-[#3B82F6] transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-[#3B82F6]" />
                    <p className="text-foreground text-sm">{selectedFile.name}</p>
                    <p className="text-muted-foreground text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="border-border text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-[#3B82F6] mb-3" />
                    <p className="text-muted-foreground text-sm mb-3">
                      Drag & drop PDF files or click to upload
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-foreground"
                    >
                      Browse Files
                    </Button>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Website URL Section */}
            <div>
              <Label className="text-[#3B82F6] text-sm font-medium mb-2 block">Website URL</Label>
              <Input
                placeholder="Paste a Share Website URL"
                className="bg-background border-border text-foreground placeholder-muted-foreground"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
              />
            </div>

            {/* Save Button */}
            <Button 
              className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-foreground"
              onClick={handleSave}
              disabled={createKnowledgeBase.isPending || (!selectedFile && !formData.websiteUrl) || !formData.name}
            >
              {createKnowledgeBase.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Right Panel - Knowledge Base Table */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground mb-1">Knowledge Base</h1>
            <p className="text-muted-foreground text-sm">Manage your documents</p>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Documents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
              />
            </div>
          </div>


          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#3B82F6]">
                <tr>
                  <th className="text-left px-4 py-3 text-white font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-white font-medium">File Type</th>
                  <th className="text-left px-4 py-3 text-white font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-white font-medium">File Size</th>
                  <th className="text-left px-4 py-3 text-white font-medium">Created At</th>
                  <th className="text-left px-4 py-3 text-white font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                )}
                {!isLoading && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {knowledgeBaseData.length === 0 ? "No documents uploaded yet" : "No documents match your search"}
                    </td>
                  </tr>
                )}
                {filteredData.map((item, index) => (
                  <tr key={item._id} className={index % 2 === 0 ? "bg-card" : "bg-accent/30"}>
                    <td className="px-4 py-3 text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-foreground">{item.fileType}</td>
                    <td className="px-4 py-3 text-foreground">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-foreground">{formatFileSize(item.fileSize)}</td>
                    <td className="px-4 py-3 text-foreground">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
                        disabled={deleteKnowledgeBase.isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}