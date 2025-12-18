
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

type AspectRatio = "16:9" | "1:1" | "9:16" | "3:4" | "4:3";
type Resolution = "1K" | "2K" | "4K";

// Extend window for aistudio types
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Made aistudio optional to fix "All declarations must have identical modifiers" error
    aistudio?: AIStudio;
  }
}

const DEFAULT_PROMPT = "一张横版构图的古装影视海报。画面左边：一位穿着大红色明制官服的英俊男子，姿态端庄。画面右边：一位穿着淡绿色明制汉服的柔美女子，手中打着一把精致的油纸伞，长发随风微扬。背景：两人身后是一片巨大的半透明白色纱幔，光影交错，纱幔上清晰地映照出两人的剪影与重叠的影子。整体氛围唯美、诗意，充满古典影视感，4K画质，细节丰富。";

const App = () => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      // Use optional chaining for window.aistudio
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      setHasApiKey(!!hasKey);
    } catch (e) {
      console.error("Error checking API key status", e);
    }
  };

  const handleConfigureKey = async () => {
    try {
      // Use optional chaining for window.aistudio
      await window.aistudio?.openSelectKey();
      // Assume success as per guidelines to avoid race condition
      setHasApiKey(true);
    } catch (e) {
      setError("Failed to open API key selection dialog.");
    }
  };

  const generatePoster = async () => {
    // Check for API key if using high-quality model (resolution 2K/4K)
    if (resolution !== "1K" && !hasApiKey) {
      await handleConfigureKey();
    }

    setLoading(true);
    setError(null);
    try {
      const useProModel = resolution !== "1K";
      const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      
      // Initialize client right before use to ensure current API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            ...(useProModel ? { imageSize: resolution } : {})
          }
        },
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setImageUrl(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key verification failed. Please re-select your key.");
      } else {
        setError(err.message || "An error occurred while generating the poster.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getAspectClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case "16:9": return "aspect-video";
      case "1:1": return "aspect-square";
      case "9:16": return "aspect-[9/16]";
      case "3:4": return "aspect-[3/4]";
      case "4:3": return "aspect-[4/3]";
      default: return "aspect-video";
    }
  };

  const allAspectRatios: AspectRatio[] = ["1:1", "3:4", "4:3", "9:16", "16:9"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-serif selection:bg-[#8b0000] selection:text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/silk.png')]"></div>
      
      <header className="relative z-10 pt-12 pb-8 text-center border-b border-white/10">
        <h1 className="text-4xl md:text-6xl tracking-[0.2em] font-light mb-2 text-white uppercase">
          Celestial <span className="text-[#8b0000]">Shadows</span>
        </h1>
        <p className="text-sm tracking-widest opacity-60 font-sans uppercase">Cinematic Poster Studio</p>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          <div className="lg:col-span-1 space-y-8 bg-white/5 p-8 rounded-sm border border-white/10 backdrop-blur-md">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-4 opacity-50">Scene Description</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-black/40 border border-white/20 rounded-sm p-4 text-sm leading-relaxed focus:border-[#8b0000] transition-colors outline-none resize-none font-sans"
                placeholder="Describe your cinematic vision..."
              />
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-4 opacity-50">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {allAspectRatios.map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 text-[10px] uppercase tracking-widest border transition-all duration-300 font-sans ${
                        aspectRatio === ratio
                          ? "bg-[#8b0000] border-[#8b0000] text-white shadow-[0_0_15px_rgba(139,0,0,0.4)]"
                          : "bg-transparent border-white/10 text-white/40 hover:border-white/30"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest mb-4 opacity-50">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1K", "2K", "4K"] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-2 text-[10px] uppercase tracking-widest border transition-all duration-300 font-sans ${
                        resolution === res
                          ? "bg-[#8b0000] border-[#8b0000] text-white shadow-[0_0_15px_rgba(139,0,0,0.4)]"
                          : "bg-transparent border-white/10 text-white/40 hover:border-white/30"
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {resolution !== "1K" && !hasApiKey && (
              <div className="p-4 bg-amber-900/20 border border-amber-500/50 rounded-sm">
                <p className="text-[10px] uppercase tracking-wider text-amber-200 mb-3">
                  High Resolution requires a paid API key from Google Cloud.
                </p>
                <button
                  onClick={handleConfigureKey}
                  className="w-full py-2 text-[10px] uppercase tracking-widest bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/40 transition-colors"
                >
                  Configure API Key
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block mt-2 text-[9px] text-amber-200/50 hover:text-amber-200 underline text-center uppercase tracking-tighter"
                >
                  Billing Documentation
                </a>
              </div>
            )}

            <button
              onClick={generatePoster}
              disabled={loading}
              className={`w-full py-4 rounded-sm uppercase tracking-[0.3em] text-sm transition-all duration-500 border border-[#8b0000] 
                ${loading 
                  ? 'bg-transparent text-[#8b0000] cursor-not-allowed opacity-50' 
                  : 'bg-[#8b0000] text-white hover:bg-transparent hover:text-[#8b0000]'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Rendering {resolution}...
                </span>
              ) : `Generate ${resolution} Poster`}
            </button>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-200 text-xs rounded-sm animate-pulse">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-white/5 space-y-4">
               <p className="text-[10px] uppercase tracking-widest opacity-40 leading-loose">
                 {resolution === "1K" 
                   ? "Fast Mode: Optimized for speed via Gemini 2.5 Flash." 
                   : "Quality Mode: Ultra-HD details via Gemini 3 Pro."}
               </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className={`relative ${getAspectClass(aspectRatio)} w-full bg-black border border-white/10 overflow-hidden rounded-sm group shadow-2xl transition-all duration-700 max-h-[75vh] mx-auto`}>
              {imageUrl ? (
                <>
                  <img 
                    src={imageUrl} 
                    alt="Generated Poster" 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                    <a 
                      href={imageUrl} 
                      download={`poster-${aspectRatio.replace(':', '-')}-${resolution}.png`}
                      className="px-6 py-2 bg-white text-black text-xs uppercase tracking-widest font-sans hover:bg-[#8b0000] hover:text-white transition-colors"
                    >
                      Download {resolution} Image
                    </a>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-4 text-center p-12">
                  <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center animate-pulse">
                     <span className="text-[#8b0000] text-2xl font-serif">影</span>
                  </div>
                  <div>
                    <p className="text-lg tracking-[0.2em] font-light">Composition: {aspectRatio}</p>
                    <p className="text-xs opacity-40 uppercase tracking-widest mt-1 font-sans">Awaiting Artistic Prompt...</p>
                  </div>
                </div>
              )}
              
              {loading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <div className="relative">
                    <div className="w-24 h-24 border-t-2 border-b-2 border-[#8b0000] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 border-l-2 border-r-2 border-white/20 rounded-full animate-spin [animation-direction:reverse]"></div>
                    </div>
                  </div>
                  <p className="mt-8 text-xs uppercase tracking-[0.5em] animate-pulse">Finalizing Masterpiece</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-between items-center px-2">
              <div className="flex gap-4 opacity-40 text-[10px] uppercase tracking-widest font-sans">
                <span>Format: {aspectRatio}</span>
                <span>Resolution: {resolution}</span>
                <span>Ming Cinematic Style</span>
              </div>
              <div className="h-[1px] flex-grow mx-8 bg-white/10"></div>
              <span className="text-[10px] opacity-20 font-sans uppercase">v2.5 Professional</span>
            </div>
          </div>

        </div>
      </main>

      <footer className="relative z-10 py-12 text-center opacity-30 text-[10px] uppercase tracking-[0.2em] font-sans">
        &copy; {new Date().getFullYear()} Cinematic AI Labs &bull; Professional Edition
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200;400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        
        body {
          margin: 0;
          font-family: 'Playfair Display', 'Noto Serif SC', serif;
          background-color: #0a0a0a;
        }

        @keyframes subtle-drift {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }

        .bg-silk {
          animation: subtle-drift 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// Defensive mounting logic to prevent React 19 #299 error
const container = document.getElementById('root');
if (container) {
  const anyContainer = container as any;
  if (!anyContainer._reactRoot) {
    anyContainer._reactRoot = createRoot(container);
  }
  anyContainer._reactRoot.render(<App />);
}
