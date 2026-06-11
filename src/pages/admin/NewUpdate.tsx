import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiFetch, apiUpload } from "@/lib/api";
import { Upload, X, Plus, Loader2 } from "lucide-react";

interface Project { id: string; name: string; progress: number; }

export default function NewUpdate() {
  const { id } = useParams<{ id: string }>();
  const projectId = id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => apiFetch<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const [links, setLinks] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Initialize progress at project's current progress
  const currentProgress = project?.progress ?? 0;
  const [progress, setProgress] = useState<number>(currentProgress);

  // Keep progress in sync when project data loads
  const [initialized, setInitialized] = useState(false);
  if (project && !initialized) {
    setProgress(project.progress);
    setInitialized(true);
  }

  const createUpdate = useMutation({
    mutationFn: (body: unknown) => apiFetch(`/projects/${projectId}/updates`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["updates", projectId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Update Posted", description: "The project timeline has been updated." });
      setLocation(`/projects/${projectId}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await apiUpload(file);
      setImages(prev => {
        const filtered = prev.filter(i => i !== "");
        return [...filtered, url, ""];
      });
      toast({ title: "Image Uploaded" });
    } catch {
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const validLinks = links.filter(l => l.trim() !== "");
    const validImages = images.filter(i => i.trim() !== "");
    createUpdate.mutate({
      projectId,
      title: fd.get("title"),
      description: fd.get("description") || undefined,
      progress,
      date: new Date().toISOString(),
      links: validLinks.length > 0 ? validLinks : undefined,
      imageUrls: validImages.length > 0 ? validImages : undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-primary">{project?.name || "..."}</Link>
        <span>/</span>
        <span className="text-foreground">New Update</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-serif">Post Project Update</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Update Title *</Label>
              <Input name="title" required placeholder="e.g. Design Concepts Finalized" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" rows={4} placeholder="Detail what was accomplished..." />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Update Progress</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current: <span className="font-semibold text-primary">{currentProgress}%</span> — can only increase
                  </p>
                </div>
                <span className="font-bold text-primary text-lg">{progress}%</span>
              </div>
              <Slider
                value={[progress]}
                onValueChange={(v) => {
                  if (v[0] >= currentProgress) setProgress(v[0]);
                  else setProgress(currentProgress);
                }}
                min={currentProgress}
                max={100}
                step={5}
                className="py-4"
              />
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              {progress > currentProgress && (
                <p className="text-xs text-emerald-500 font-medium">
                  ✓ Progress will increase from {currentProgress}% → {progress}%
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              {/* Image Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Screenshots / Images</Label>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                      <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                        <span>
                          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                          Upload
                        </span>
                      </Button>
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setImages(prev => [...prev, ""])}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> URL
                    </Button>
                  </div>
                </div>
                {images.map((img, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={img}
                      onChange={(e) => {
                        const n = [...images]; n[i] = e.target.value; setImages(n);
                      }}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    {img && (
                      <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Reference Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Reference Links</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinks(prev => [...prev, ""])}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Link
                  </Button>
                </div>
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={link}
                      onChange={(e) => {
                        const n = [...links]; n[i] = e.target.value; setLinks(n);
                      }}
                      placeholder="https://figma.com/..."
                    />
                    {link && (
                      <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setLocation(`/projects/${projectId}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUpdate.isPending} className="bg-primary text-primary-foreground">
                {createUpdate.isPending ? "Posting..." : "Post Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
