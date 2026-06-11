import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";
import SBLogo from "@/components/SBLogo";

export default function FeedbackForm() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Parse projectId from query string
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("projectId") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comments, setComments] = useState<string>("");
  const [recommendRating, setRecommendRating] = useState<number>(10);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setError("No project identifier was provided. Please check your feedback link.");
      setLoading(false);
      return;
    }

    // Fetch project validation info
    apiFetch<any>(`/feedback/project-info/${projectId}`)
      .then((data) => {
        setProjectInfo(data);
        if (data.feedbackSubmitted) {
          setSubmitted(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load project details. Please verify your link.");
        setLoading(false);
      });
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      toast({ title: "Please enter your comments", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/feedback", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          rating,
          comments,
          recommendRating
        })
      });

      setSubmitted(true);
      toast({ title: "Feedback Submitted ✅", description: "Thank you for sharing your experience with us!" });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading project details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="max-w-md w-full border-red-500/20 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold font-serif">Oops! Something went wrong</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            <Button className="w-full mt-2" onClick={() => window.location.href = "/"}>
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500/[0.05] via-indigo-500/[0.02] to-transparent flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8 select-none">
        <SBLogo size={48} rounded="xl" />
        <div>
          <span className="font-serif font-black text-foreground text-lg block leading-tight tracking-wide">Strategic Brand Solutions</span>
          <span className="text-xs text-muted-foreground block">Creative Digital Consultancy</span>
        </div>
      </div>

      <div className="max-w-xl w-full">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="thank-you"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-t-4 border-t-emerald-500 shadow-2xl relative overflow-hidden">
                {/* Visual Decorative Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                <CardContent className="p-8 sm:p-10 text-center space-y-5 relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold font-serif text-foreground">Thank You for Your Feedback!</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We truly appreciate you taking the time to share your experience. Your feedback helps us continuously refine our services and deliver outstanding brand solutions.
                    </p>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-xl text-xs text-left text-muted-foreground space-y-2 border border-border/50">
                    <p><strong>Project Name:</strong> {projectInfo?.projectName}</p>
                    <p><strong>Client:</strong> {projectInfo?.clientName} {projectInfo?.clientCompany ? `(${projectInfo?.clientCompany})` : ""}</p>
                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">✓ Review successfully saved to our client database.</p>
                  </div>

                  <div className="pt-2">
                    <Button 
                      onClick={() => window.location.href = "/login"}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
                    >
                      Access Your Client Portal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-border/60 shadow-2xl overflow-hidden relative">
                {/* Background Glows */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
                <CardHeader className="pb-4 border-b border-border/50 bg-muted/10">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" /> Client Project Feedback
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Please rate your overall experience with the deliverables for <strong>{projectInfo?.projectName}</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Read-Only Project Metadata */}
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Project</span>
                        <span className="font-bold text-foreground truncate block">{projectInfo?.projectName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Client</span>
                        <span className="font-bold text-foreground truncate block">{projectInfo?.clientName}</span>
                      </div>
                    </div>

                    {/* Star Rating Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        1. Overall Satisfaction Rating
                      </Label>
                      <div className="flex items-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = hoverRating !== null ? star <= hoverRating : star <= rating;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-8 h-8 ${
                                  active 
                                    ? "fill-amber-400 text-amber-400 drop-shadow-md" 
                                    : "text-zinc-300 dark:text-zinc-700"
                                }`}
                              />
                            </button>
                          );
                        })}
                        <span className="text-xs font-bold text-muted-foreground ml-2">
                          {rating === 5 ? "Excellent! ⭐⭐⭐⭐⭐" :
                           rating === 4 ? "Very Good! ⭐⭐⭐⭐" :
                           rating === 3 ? "Good / Satisfactory ⭐⭐⭐" :
                           rating === 2 ? "Needs Improvement ⭐⭐" :
                           "Unsatisfactory ⭐"}
                        </span>
                      </div>
                    </div>

                    {/* Recommend Rating 1-10 Slider */}
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center text-xs">
                        <Label className="font-semibold text-foreground uppercase tracking-wider">
                          2. How likely are you to recommend us?
                        </Label>
                        <span className="font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                          {recommendRating} / 10
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={recommendRating}
                          onChange={(e) => setRecommendRating(Number(e.target.value))}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                          <span>Not Likely (1)</span>
                          <span>Neutral (5)</span>
                          <span>Extremely Likely (10)</span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback Comments Textarea */}
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="comments" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        3. Detailed Comments & Feedback
                      </Label>
                      <Textarea
                        id="comments"
                        required
                        placeholder="Tell us what you liked, what we did well, and what could be improved in the future..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="h-28 text-sm focus-visible:ring-primary leading-relaxed"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Submitting feedback...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" /> Submit Feedback Review
                          </>
                        )}
                      </Button>
                    </div>

                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
