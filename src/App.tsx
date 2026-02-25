/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  ChevronDown, Sparkles, Layout, Palette, Type as TypeIcon, Image as ImageIcon, Box, 
  Zap, Heart, Shield, Target, Search, Bell, Settings, User 
} from "lucide-react";

type ViewState = "landing" | "form" | "loading" | "result";
type Language = "en" | "ko";

interface FormData {
  brandName: string;
  industry: string;
  touchpoint: string;
  selectedTones: string[];
  negativePreference: string;
}

const TRANSLATIONS = {
  en: {
    editInput: "Edit Input",
    brandIdentity: "Brand Identity",
    typography: "Typography",
    colorDefinition: "Color Definition",
    visualMoodboard: "Visual Moodboard",
    iconStyleGuide: "Icon Style Guide",
    toneOfVoice: "Tone of Voice",
    brandMission: "Brand Mission",
    coreValue: "Core Value",
    visualSignature: "Visual Signature",
    typographyDesc: "A systematic typographic approach ensuring clarity and character across all platforms.",
    colorDesc: "Core brand colors derived from the 4-axis personality profile.",
    moodboardDesc: "A curated grid of imagery defining the brand's aesthetic universe.",
    iconDesc: "A cohesive set of functional and decorative icons maintaining brand consistency.",
    toneDesc: "The verbal identity and emotional resonance of the brand communication.",
    primaryIcons: "Primary Icons",
    heading1: "Heading 1",
    heading2: "Heading 2",
    bodyText: "Body Text / The quick brown fox jumps over the lazy dog.",
    backToMain: "Back to Main",
    brandIdentityDesc: (name: string, industry: string) => `The core essence and visual signature of ${name}, defining its unique position in the ${industry} landscape.`
  },
  ko: {
    editInput: "Edit Input",
    brandIdentity: "브랜드 아이덴티티",
    typography: "타이포그래피 시스템",
    colorDefinition: "컬러 팔레트 정의",
    visualMoodboard: "비주얼 무드보드",
    iconStyleGuide: "아이코노그래피 전략",
    toneOfVoice: "보이스 앤 톤",
    brandMission: "브랜드 미션",
    coreValue: "핵심 가치",
    visualSignature: "비주얼 시그니처",
    typographyDesc: "모든 플랫폼에서 명확성과 브랜드 성격을 유지하기 위한 체계적인 타이포그래피 접근 방식입니다.",
    colorDesc: "4축 브랜드 페르소나 프로필을 기반으로 도출된 핵심 브랜드 컬러입니다.",
    moodboardDesc: "브랜드의 미학적 세계관을 정의하는 엄선된 이미지 그리드입니다.",
    iconDesc: "브랜드 일관성을 유지하기 위한 기능적이고 장식적인 아이콘 세트입니다.",
    toneDesc: "브랜드 커뮤니케이션의 언어적 정체성과 감정적 공명입니다.",
    primaryIcons: "주요 아이콘",
    heading1: "헤드라인 1",
    heading2: "헤드라인 2",
    bodyText: "본문 텍스트 / 다람쥐 헌 쳇바퀴에 타고파. (The quick brown fox jumps over the lazy dog.)",
    backToMain: "메인으로 돌아가기",
    brandIdentityDesc: (name: string, industry: string) => `${name}의 핵심 정체성과 비주얼 시그니처는 ${industry} 시장 내에서 독보적인 위치를 정의합니다.`
  }
};

export default function App() {
  const [view, setView] = useState<ViewState>("landing");
  const [lang, setLang] = useState<Language>("en");
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [brandStrategy, setBrandStrategy] = useState<{ en: string; ko: string } | null>(null);
  const [aiGeneratedAssets, setAiGeneratedAssets] = useState<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    primaryFont: string;
    secondaryFont: string;
    slogan: { en: string; ko: string };
    mission: { en: string; ko: string };
    coreValue: { en: string; ko: string };
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    brandName: "",
    industry: "",
    touchpoint: "",
    selectedTones: [],
    negativePreference: "",
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const TONE_TO_CATEGORY: Record<string, string> = {
    Conservative: "Vibe", Innovative: "Vibe", Minimal: "Vibe", Maximal: "Vibe", Bold: "Vibe", Classic: "Vibe",
    Casual: "Voice", Premium: "Voice", Cool: "Voice", Warm: "Voice", Friendly: "Voice", Authoritative: "Voice",
    "Tech-driven": "Concept", "Human-centric": "Concept", "Eco-friendly": "Concept", Artistic: "Concept", Futuristic: "Concept"
  };

  const handleToneToggle = (tone: string) => {
    const category = TONE_TO_CATEGORY[tone];
    setFormData((prev) => {
      const isSelected = prev.selectedTones.includes(tone);
      if (!isSelected) {
        const categoryTones = prev.selectedTones.filter(t => TONE_TO_CATEGORY[t] === category);
        if (categoryTones.length >= 2) {
          setToast(lang === "en" ? `You can select up to 2 items in ${category}.` : `해당 카테고리는 2개까지만 선택 가능합니다.`);
          return prev;
        }
      }
      return {
        ...prev,
        selectedTones: isSelected
          ? prev.selectedTones.filter((t) => t !== tone)
          : [...prev.selectedTones, tone],
      };
    });
  };

  const resetForm = () => {
    setFormData({
      brandName: "",
      industry: "",
      touchpoint: "",
      selectedTones: [],
      negativePreference: "",
    });
    setBrandStrategy(null);
    setAiGeneratedAssets(null);
    setStep(1);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.brandName || !formData.industry || !formData.touchpoint) return false;
    } else if (step === 2) {
      if (formData.selectedTones.length === 0) return false;
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((prev) => Math.min(prev + 1, 3));
    } else {
      setToast("Please fill out all fields to proceed.");
    }
  };

  const LOADING_MESSAGES = [
    lang === "en" ? "Analyzing your 4-axis brand tone..." : "4축 브랜드 페르소나 분석 중...",
    lang === "en" ? `Curating ${formData.industry} assets...` : `${formData.industry} 산업군 자산 큐레이션 중...`,
    lang === "en" ? "Building your custom brand dashboard..." : "맞춤형 브랜드 대시보드 구축 중...",
    lang === "en" ? "Finalizing your brand identity system..." : "브랜드 아이덴티티 시스템 최종 점검 중..."
  ];

  const handleGenerate = async () => {
    if (validateStep()) {
      setView("loading");
      setLoadingMsgIndex(0);
      
      const interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1000);

      const startTime = Date.now();

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview";
        
        const prompt = `
          ### ABSOLUTE DESIGN CONSTRAINTS (PRIORITY 1 - MUST FOLLOW):
          "${formData.negativePreference || "None"}"
          
          You are a world-class brand strategist and senior designer. 
          Create a concise brand strategy (2-3 sentences), a catchy slogan, a brand mission, and a core value for a brand named "${formData.brandName}" in the "${formData.industry}" industry.
          The primary touchpoint is "${formData.touchpoint}".
          
          The brand personality is built around these keywords: ${formData.selectedTones.join(", ")}.
          
          ### BILINGUAL REQUIREMENT:
          You MUST provide all text data (strategy, slogan, mission, coreValue) in BOTH English (en) and Korean (ko).
          
          ### DESIGN TASK:
          1. Strategy: Explain how the selected tones drive the brand's positioning.
          2. Slogan: A short, memorable phrase.
          3. Mission: A statement of the brand's purpose.
          4. Core Value: A single key principle.
          5. Colors: Suggest a Primary, Secondary, and Accent brand color in HEX format.
          6. Fonts: Choose a Primary Font (for headings) and a Secondary Font (for body text) from the following list:
             - Serif: "Cormorant Garamond", "Lora", "Playfair Display", "Fraunces"
             - Sans-serif: "Inter", "Montserrat", "Roboto", "Archivo", "Outfit"
             - Display/Experimental: "Syncopate", "Syne", "Space Grotesk"
          
          ### CRITICAL RULE ON NEGATIVE PREFERENCES:
          The "Negative Preference" provided above is an ABSOLUTE design constraint. 
          - If the user says "Primary color fixed to black", you MUST return "#000000" as the primaryColor, regardless of industry standards.
          - If the user says "Avoid blue", you MUST NOT use any blue hues.
          - If the user says "Use only serif fonts", you MUST choose from the Serif list.
          
          Return the response in JSON format.
        `;

        const response = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                strategy: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ko: { type: Type.STRING }
                  },
                  required: ["en", "ko"]
                },
                slogan: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ko: { type: Type.STRING }
                  },
                  required: ["en", "ko"]
                },
                mission: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ko: { type: Type.STRING }
                  },
                  required: ["en", "ko"]
                },
                coreValue: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    ko: { type: Type.STRING }
                  },
                  required: ["en", "ko"]
                },
                primaryColor: { type: Type.STRING, description: "HEX color code (e.g., #000000)" },
                secondaryColor: { type: Type.STRING, description: "HEX color code" },
                accentColor: { type: Type.STRING, description: "HEX color code" },
                primaryFont: { type: Type.STRING, description: "Font name from the provided list" },
                secondaryFont: { type: Type.STRING, description: "Font name from the provided list" },
              },
              required: ["strategy", "slogan", "mission", "coreValue", "primaryColor", "secondaryColor", "accentColor", "primaryFont", "secondaryFont"]
            }
          }
        });

        const result = JSON.parse(response.text || "{}");
        setBrandStrategy(result.strategy);
        if (result.primaryColor && result.secondaryColor) {
          setAiGeneratedAssets({
            primaryColor: result.primaryColor,
            secondaryColor: result.secondaryColor,
            accentColor: result.accentColor || "#FFFFFF",
            primaryFont: result.primaryFont || "Inter",
            secondaryFont: result.secondaryFont || "Inter",
            slogan: result.slogan,
            mission: result.mission,
            coreValue: result.coreValue
          });
        }
      } catch (error) {
        console.error("Gemini Error:", error);
        setBrandStrategy({
          en: "Failed to generate strategy. Please try again.",
          ko: "전략 생성에 실패했습니다. 다시 시도해주세요."
        });
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 3000 - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        clearInterval(interval);
        setView("result");
      }
    } else {
      setToast("Please fill out all fields to proceed.");
    }
  };

  // Helper to derive brand assets
  const getBrandAssets = () => {
    // Helper to convert HEX to RGB
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };

    // Advanced Color Calculation Logic
    const getBaseHue = (industry: string) => {
      const hues: Record<string, number> = {
        "Healthcare": 200, // Blue
        "Fintech": 220, // Deep Blue
        "SaaS & AI": 260, // Purple/Violet
        "Fashion & Luxury": 340, // Pink/Rose
        "Beauty & Wellness": 160, // Teal/Green
        "Food & Beverage": 30, // Orange/Brown
        "Architecture & Interior": 45, // Gold/Beige
        "Creative & Design": 280, // Vibrant Purple
        "Arts & Entertainment": 10, // Red
        "E-commerce": 190, // Cyan
        "Education": 210, // Professional Blue
      };
      return hues[industry] || 200;
    };

    const h = getBaseHue(formData.industry);
    const s = 60;
    const l = 50;

    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    const primaryHex = aiGeneratedAssets?.primaryColor || hslToHex(h, s, l);
    const secondaryHex = aiGeneratedAssets?.secondaryColor || hslToHex((h + 30) % 360, s * 0.8, l + 10);
    const accentHex = aiGeneratedAssets?.accentColor || "#ffffff";

    const colorData = [
      { hex: primaryHex, rgb: hexToRgb(primaryHex), role: "Primary" },
      { hex: secondaryHex, rgb: hexToRgb(secondaryHex), role: "Secondary" },
      { hex: accentHex, rgb: hexToRgb(accentHex), role: "Accent" },
    ];

    // Professional Typography Mapping
    const fonts = { 
      heading: aiGeneratedAssets?.primaryFont || "Inter", 
      body: aiGeneratedAssets?.secondaryFont || "Inter" 
    };

    const slogan = aiGeneratedAssets?.slogan || {
      en: formData.selectedTones.includes("Innovative") ? "Defining the Future of Excellence." : "Timeless Quality, Modern Vision.",
      ko: formData.selectedTones.includes("Innovative") ? "탁월함의 미래를 정의합니다." : "시대를 초월한 품질, 현대적 비전."
    };

    // Advanced Tone of Voice keywords
    const keywordData = formData.selectedTones.map(tone => ({
      title: tone,
      desc: lang === "en" 
        ? `Reflecting a ${tone.toLowerCase()} brand personality.` 
        : `${tone} 브랜드 성격을 반영합니다.`
    }));
    
    // Industry specific
    const industryKeywords: Record<string, any> = {
      "Healthcare": { en: "Empathetic", ko: "공감적인 (Empathetic)", descEn: "Human-centric approach prioritizing patient well-being.", descKo: "환자의 안녕을 최우선으로 하는 인간 중심적 접근." },
      "Fintech": { en: "Authoritative", ko: "권위 있는 (Authoritative)", descEn: "Expert-led guidance building deep trust.", descKo: "깊은 신뢰를 구축하는 전문가 주도의 가이드." },
      "SaaS & AI": { en: "Avant-garde", ko: "선구적인 (Avant-garde)", descEn: "Leading with experimental and innovative solutions.", descKo: "실험적이고 혁신적인 솔루션으로 시장을 선도." },
      "Fashion & Luxury": { en: "Sophisticated", ko: "세련된 (Sophisticated)", descEn: "Refined aesthetics for a discerning audience.", descKo: "안목 있는 고객을 위한 정교한 미학." },
      "Creative & Design": { en: "Dynamic", ko: "역동적인 (Dynamic)", descEn: "Energetic communication that sparks inspiration.", descKo: "영감을 자극하는 활기찬 소통." }
    };

    if (industryKeywords[formData.industry] && keywordData.length < 4) {
      const k = industryKeywords[formData.industry];
      keywordData.push({ title: lang === "en" ? k.en : k.ko, desc: lang === "en" ? k.descEn : k.descKo });
    }

    const mission = aiGeneratedAssets?.mission || {
      en: `To empower ${formData.industry} through ${formData.selectedTones.join(" and ")}.`,
      ko: `${formData.industry} 산업을 ${formData.selectedTones.join("와 ")}으로 이끄는 브랜드.`
    };
    
    const coreValue = aiGeneratedAssets?.coreValue || {
      en: formData.selectedTones.includes("Premium") ? "Uncompromising Quality" : "Community First",
      ko: formData.selectedTones.includes("Premium") ? "타협하지 않는 품질" : "커뮤니티 중심 가치"
    };

    const iconStyle = formData.selectedTones.includes("Minimal") ? "Line" : "Solid";

    return { colors: colorData, fonts, slogan, keywords: keywordData.slice(0, 4), mission, coreValue, iconStyle };
  };

  const assets = getBrandAssets();

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#1B1D1F] font-sans">
      {/* Fixed Spline Background */}
      <div className="absolute inset-0 z-0">
        <iframe
          src="https://my.spline.design/glassmorphlandingpage-5OwfExB4HsJiGccCh1K2Fw6l/"
          frameBorder="0"
          width="100%"
          height="100%"
          className="w-full h-full pointer-events-auto"
          title="Spline 3D Background"
        />
      </div>

      {/* UI Elements (Always visible or conditionally visible) */}
      <div className="absolute top-8 left-8 z-30">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div
              key="project-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/30 text-xs font-mono tracking-widest uppercase pointer-events-none"
            >
              Project // 001
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Language Toggle (Moved to Result View) */}
      {view === "result" && (
        <div className="absolute top-8 right-8 z-40 flex items-center gap-1 p-1 bg-zinc-800/80 backdrop-blur-xl border border-white/20 rounded-full shadow-xl">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
              lang === "en" ? "bg-white/90 text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/40 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ko")}
            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
              lang === "ko" ? "bg-white/90 text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/40 hover:text-white"
            }`}
          >
            한
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === "landing" ? (
          /* Landing View */
          <motion.div
            key="landing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center justify-center w-full h-full px-6 text-center pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl"
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tighter leading-none">
                Define Your <br />
                <span className="text-white/80">Brand Identity</span>
              </h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mt-6 text-lg md:text-xl text-white/50 font-light tracking-wide uppercase"
              >
                The next generation of brand styling powered by advanced AI
              </motion.p>

              <motion.button
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="mt-10 px-8 py-4 bg-white/10 border border-white/20 backdrop-blur-md rounded-full text-white font-semibold transition-all hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] pointer-events-auto cursor-pointer"
              >
                Branding Start
              </motion.button>
            </motion.div>

            <div className="absolute bottom-8 right-8 pointer-events-none">
              <div className="text-white/30 text-xs font-mono tracking-widest uppercase">
                Scroll to explore
              </div>
            </div>
          </motion.div>
        ) : view === "loading" ? (
          /* Loading View */
          <motion.div
            key="loading-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-30 flex flex-col items-center justify-center w-full h-full px-6 text-center"
          >
            <div className="flex flex-col items-center max-w-md w-full">
              <div className="w-full space-y-8">
                {/* Progress Bar with Glow */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="h-full bg-white/90 shadow-[0_0_25px_rgba(255,255,255,0.6)]"
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMsgIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-white text-xl font-bold tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  >
                    {LOADING_MESSAGES[loadingMsgIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : view === "result" ? (
          /* Result View - Professional Style Guide v3 */
          <motion.div
            key="result-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 w-full h-full overflow-y-auto pt-24 pb-20 px-6"
          >
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Edit Button */}
              <div className="flex justify-start mb-4">
                <button
                  onClick={() => setView("form")}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-white/10 border border-white/30 backdrop-blur-md rounded-full text-white text-[10px] font-bold font-mono tracking-widest uppercase transition-all hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-lg"
                >
                  <ChevronDown className="w-3 h-3 rotate-90" />
                  {TRANSLATIONS[lang].editInput}
                </button>
              </div>

              {/* 00. Brand Identity Section */}
              <section className="relative bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 overflow-hidden shadow-2xl ring-1 ring-white/5">
                <span className="absolute top-8 left-10 text-white/20 font-mono text-sm">00.</span>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm" style={{ fontFamily: assets.fonts.heading }}>{TRANSLATIONS[lang].brandIdentity}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {brandStrategy ? brandStrategy[lang] : TRANSLATIONS[lang].brandIdentityDesc(formData.brandName, formData.industry)}
                    </p>
                  </div>
                  <div className="lg:col-span-8 space-y-10">
                    <div className="space-y-4">
                      <p className="text-white/90 font-mono text-[10px] uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{TRANSLATIONS[lang].visualSignature}</p>
                      <motion.h1 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="font-extrabold tracking-tighter leading-none drop-shadow-md break-words text-white"
                        style={{ 
                          fontFamily: assets.fonts.heading,
                          fontSize: formData.brandName.length > 12 ? "clamp(2.5rem, 8vw, 4rem)" : "clamp(3rem, 15vw, 7rem)"
                        }}
                      >
                        {formData.brandName}
                      </motion.h1>
                      <p className="text-white/60 text-xl md:text-2xl font-light italic drop-shadow-sm" style={{ fontFamily: assets.fonts.body }}>"{assets.slogan[lang]}"</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
                      <div className="relative p-6 bg-white/[0.03] border-l-2 border-white/40 rounded-r-2xl space-y-3 transition-colors hover:bg-white/[0.05]">
                        <h4 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{TRANSLATIONS[lang].brandMission}</h4>
                        <p className="text-white text-lg font-semibold leading-snug" style={{ fontFamily: assets.fonts.heading }}>{assets.mission[lang]}</p>
                      </div>
                      <div className="relative p-6 bg-white/[0.03] border-l-2 border-white/40 rounded-r-2xl space-y-3 transition-colors hover:bg-white/[0.05]">
                        <h4 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{TRANSLATIONS[lang].coreValue}</h4>
                        <p className="text-white text-lg font-semibold leading-snug" style={{ fontFamily: assets.fonts.heading }}>{assets.coreValue[lang]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 01. Typography Section */}
              <section className="relative bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 overflow-hidden shadow-2xl ring-1 ring-white/5">
                <span className="absolute top-8 left-10 text-white/20 font-mono text-sm">01.</span>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm" style={{ fontFamily: assets.fonts.heading }}>{TRANSLATIONS[lang].typography}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {TRANSLATIONS[lang].typographyDesc}
                    </p>
                  </div>
                  <div className="lg:col-span-8 space-y-12">
                    {/* H1 */}
                    <div className="flex flex-col md:flex-row md:items-end gap-6 border-b border-white/5 pb-8">
                      <div className="text-6xl md:text-8xl text-white font-bold drop-shadow-sm" style={{ fontFamily: assets.fonts.heading }}>Aa</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-white text-4xl font-bold drop-shadow-sm" style={{ fontFamily: assets.fonts.heading }}>{TRANSLATIONS[lang].heading1}</p>
                        <div className="flex flex-wrap gap-6 text-[10px] font-mono text-white/40 uppercase tracking-widest mt-6">
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Font Family</span>
                            <span className="text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{assets.fonts.heading}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Style</span>
                            <span>Bold</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Size</span>
                            <span>32px</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* H2 */}
                    <div className="flex flex-col md:flex-row md:items-end gap-6 border-b border-white/5 pb-8">
                      <div className="text-4xl md:text-6xl text-white font-semibold drop-shadow-sm" style={{ fontFamily: assets.fonts.heading }}>Aa</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-white text-2xl font-semibold drop-shadow-sm" style={{ fontFamily: assets.fonts.heading }}>{TRANSLATIONS[lang].heading2}</p>
                        <div className="flex flex-wrap gap-6 text-[10px] font-mono text-white/40 uppercase tracking-widest mt-6">
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Font Family</span>
                            <span className="text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{assets.fonts.heading}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Style</span>
                            <span>Semibold</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Size</span>
                            <span>24px</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Body */}
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      <div className="text-2xl text-white font-normal drop-shadow-sm" style={{ fontFamily: `'${assets.fonts.body}', sans-serif` }}>Aa</div>
                      <div className="flex-1 space-y-3">
                        <p className="text-white text-base leading-relaxed drop-shadow-sm" style={{ fontFamily: `'${assets.fonts.body}', sans-serif` }}>
                          {TRANSLATIONS[lang].bodyText}
                        </p>
                        <div className="flex flex-wrap gap-6 text-[10px] font-mono text-white/40 uppercase tracking-widest mt-6">
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Font Family</span>
                            <span className="text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{assets.fonts.body}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Style</span>
                            <span>Regular / Light</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-white/60 font-bold">Size</span>
                            <span>16px</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 02. Color Palette Section */}
              <section className="relative bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 overflow-hidden shadow-2xl ring-1 ring-white/5">
                <span className="absolute top-8 left-10 text-white/20 font-mono text-sm">02.</span>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm">{TRANSLATIONS[lang].colorDefinition}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {TRANSLATIONS[lang].colorDesc}
                    </p>
                  </div>
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {assets.colors.map((color, i) => (
                      <div key={i} className="group space-y-4">
                        <div 
                          className="aspect-square rounded-3xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02] border border-white/5" 
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="px-2">
                          <p className="text-white font-bold text-xs uppercase tracking-widest mb-1 drop-shadow-sm">{color.role}</p>
                          <div className="space-y-0.5">
                            <p className="text-white/60 text-[10px] font-mono uppercase">HEX: {color.hex}</p>
                            <p className="text-white/40 text-[10px] font-mono uppercase">RGB: {color.rgb}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 03. Visual Moodboard Section */}
              <section className="relative bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 overflow-hidden shadow-2xl ring-1 ring-white/5">
                <span className="absolute top-8 left-10 text-white/20 font-mono text-sm">03.</span>
                <div className="space-y-10">
                  <div className="max-w-xl space-y-4">
                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm" style={{ fontFamily: `'${assets.fonts.heading}', sans-serif` }}>{TRANSLATIONS[lang].visualMoodboard}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {TRANSLATIONS[lang].moodboardDesc}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <div key={num} className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                        <img 
                          src={`https://picsum.photos/seed/${formData.brandName}-${formData.industry}-${formData.selectedTones[0] || 'brand'}-${num}/800/800`} 
                          className="w-full h-full object-cover opacity-100" 
                          referrerPolicy="no-referrer" 
                          alt={`Moodboard ${num}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 04. Iconography Strategy Section */}
              <section className="relative bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 overflow-hidden shadow-2xl ring-1 ring-white/5">
                <span className="absolute top-8 left-10 text-white/20 font-mono text-sm">04.</span>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm" style={{ fontFamily: `'${assets.fonts.heading}', sans-serif` }}>{TRANSLATIONS[lang].iconStyleGuide}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {TRANSLATIONS[lang].iconDesc}
                    </p>
                  </div>
                  <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-6">
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{TRANSLATIONS[lang].primaryIcons} ({assets.iconStyle} Style)</p>
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                        {[
                          { Icon: Zap, label: lang === "en" ? "Action" : "액션", role: "Action" },
                          { Icon: Shield, label: lang === "en" ? "Security" : "보안", role: "System" },
                          { Icon: Target, label: lang === "en" ? "Goal" : "목표", role: "Interface" },
                          { Icon: Heart, label: lang === "en" ? "Social" : "소셜", role: "Feedback" },
                          { Icon: Search, label: lang === "en" ? "Search" : "검색", role: "Navigation" },
                          { Icon: Bell, label: lang === "en" ? "Notice" : "알림", role: "Alert" },
                          { Icon: Settings, label: lang === "en" ? "Config" : "설정", role: "System" },
                          { Icon: User, label: lang === "en" ? "Account" : "계정", role: "User" }
                        ].map(({ Icon, label, role }, i) => (
                          <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-full aspect-square bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center group hover:bg-white/10 hover:border-white/30 transition-all duration-300">
                              <Icon 
                                className={`w-6 h-6 transition-colors ${assets.iconStyle === "Solid" ? "fill-white/60 text-transparent" : "text-white/60"} group-hover:text-white group-hover:fill-white/20 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`} 
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] text-white font-bold uppercase tracking-tighter">{label}</p>
                              <p className="text-[7px] text-white/30 font-mono uppercase">{role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 05. Tone of Voice Section */}
              <section className="relative bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 overflow-hidden shadow-2xl ring-1 ring-white/5">
                <span className="absolute top-8 left-10 text-white/20 font-mono text-sm">05.</span>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-sm" style={{ fontFamily: `'${assets.fonts.heading}', sans-serif` }}>{TRANSLATIONS[lang].toneOfVoice}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {TRANSLATIONS[lang].toneDesc}
                    </p>
                  </div>
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assets.keywords.map((item, i) => (
                      <div key={i} className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl space-y-2 group hover:bg-white/[0.08] transition-all duration-300">
                        <h4 className="text-white/90 text-sm font-bold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{item.title}</h4>
                        <p className="text-white/40 text-xs leading-relaxed group-hover:text-white/60 transition-colors">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Back to Main Button */}
              <div className="flex justify-center pt-12">
                <button
                  onClick={() => {
                    resetForm();
                    setView("landing");
                  }}
                  className="px-12 py-4 bg-white/5 border border-white/10 rounded-full text-white text-sm font-bold tracking-widest uppercase transition-all hover:bg-white/10 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] shadow-xl"
                >
                  {TRANSLATIONS[lang].backToMain}
                </button>
              </div>
            </div>
          </motion.div>


        ) : (
          /* Form View Overlay */
          <motion.div
            key="form-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-20 flex items-center justify-center w-full h-full px-6 pointer-events-none"
          >
            <motion.div
              layout
              initial={{ opacity: 0, height: "auto" }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-lg pointer-events-auto bg-[#25282C]/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl overflow-visible"
            >
              <div className="mb-8 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (step > 1) setStep(step - 1);
                    else setView("landing");
                  }}
                  className="text-white hover:text-white/80 text-xs font-mono tracking-widest uppercase transition-colors flex items-center gap-2 font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                >
                  ← Back
                </button>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] font-mono text-white uppercase tracking-[0.2em] font-bold drop-shadow-sm">Step {step} of 3</span>
                  <div className="flex gap-1.5 items-center">
                    {[1, 2, 3].map((s) => (
                      <div 
                        key={s} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          s <= step 
                            ? 'w-6 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                            : 'w-2 bg-white/20'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                      <h2 className="text-white text-xs font-mono tracking-widest uppercase font-bold drop-shadow-sm">Section 01</h2>
                      <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Basic Information</h1>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white uppercase tracking-widest font-bold drop-shadow-sm">Brand Name</label>
                        <input
                          type="text"
                          name="brandName"
                          autoComplete="off"
                          value={formData.brandName}
                          onChange={handleInputChange}
                          placeholder="Enter your brand name"
                          className={`w-full bg-black/20 backdrop-blur-sm rounded-xl px-4 py-4 text-white placeholder:text-white/60 outline-none ring-0 transition-all hover:border-white/60 border [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#1B1D1F] [&:-webkit-autofill]:text-white ${
                            formData.brandName 
                              ? "border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                              : "border-white/40"
                          }`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-white uppercase tracking-widest font-bold drop-shadow-sm">Industry</label>
                        <div className="relative">
                          <div 
                            onClick={() => setOpenDropdown(openDropdown === "industry" ? null : "industry")}
                            className={`w-full bg-black/20 backdrop-blur-sm rounded-xl px-4 py-4 text-white cursor-pointer flex justify-between items-center transition-all hover:border-white/60 border ${
                              openDropdown === "industry" ? "border-white/60" : ""
                            } ${
                              formData.industry 
                                ? "border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                                : "border-white/40"
                            }`}
                          >
                            <span className={formData.industry ? "text-white" : "text-white/60"}>
                              {formData.industry || "Select Industry"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${openDropdown === "industry" ? "rotate-180" : ""}`} />
                          </div>
                          
                          <AnimatePresence>
                            {openDropdown === "industry" && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 w-full mt-2 bg-[#25282C] border border-white/20 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
                              >
                                <div className="max-h-60 overflow-y-auto py-2">
                                  {[
                                    "Architecture & Interior", "Arts & Entertainment", "Beauty & Wellness", 
                                    "Creative & Design", "E-commerce", "Education", "Fashion & Luxury", 
                                    "Fintech", "Food & Beverage", "Healthcare", "SaaS & AI"
                                  ].map((item) => (
                                    <div
                                      key={item}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, industry: item }));
                                        setOpenDropdown(null);
                                      }}
                                      className="px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-white uppercase tracking-widest font-bold drop-shadow-sm">Main Touchpoint</label>
                        <div className="relative">
                          <div 
                            onClick={() => setOpenDropdown(openDropdown === "touchpoint" ? null : "touchpoint")}
                            className={`w-full bg-black/20 backdrop-blur-sm rounded-xl px-4 py-4 text-white cursor-pointer flex justify-between items-center transition-all hover:border-white/60 border ${
                              openDropdown === "touchpoint" ? "border-white/60" : ""
                            } ${
                              formData.touchpoint 
                                ? "border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                                : "border-white/40"
                            }`}
                          >
                            <span className={formData.touchpoint ? "text-white" : "text-white/60"}>
                              {formData.touchpoint || "Select Touchpoint"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${openDropdown === "touchpoint" ? "rotate-180" : ""}`} />
                          </div>

                          <AnimatePresence>
                            {openDropdown === "touchpoint" && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 w-full mt-2 bg-[#25282C] border border-white/20 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
                              >
                                <div className="py-2">
                                  {[
                                    "Mobile App", "Website", "Physical Product/Packaging", 
                                    "Physical Store/Space", "Social Media"
                                  ].map((item) => (
                                    <div
                                      key={item}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, touchpoint: item }));
                                        setOpenDropdown(null);
                                      }}
                                      className="px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={nextStep}
                      className="w-full py-4 bg-white/10 border border-white/20 backdrop-blur-md rounded-full text-white font-semibold transition-all hover:bg-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      Next
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="space-y-8"
                   >
                    <div className="space-y-2">
                      <h2 className="text-white text-xs font-mono tracking-widest uppercase font-bold drop-shadow-sm">Section 02</h2>
                      <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Brand Tone</h1>
                      <p className="text-white/60 text-sm">Select up to 2 keywords in each category.</p>
                    </div>

                    <div className="space-y-8">
                      {/* Vibe Category */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Vibe</h3>
                        <div className="flex flex-wrap gap-2">
                          {["Conservative", "Innovative", "Minimal", "Maximal", "Bold", "Classic"].map((tone) => (
                            <button
                              key={tone}
                              onClick={() => handleToneToggle(tone)}
                              className={`px-4 py-2 rounded-full border transition-all duration-300 text-xs font-bold ${
                                formData.selectedTones.includes(tone)
                                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                  : "bg-transparent text-white border-white/20 hover:border-white/40"
                              }`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Voice Category */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Voice</h3>
                        <div className="flex flex-wrap gap-2">
                          {["Casual", "Premium", "Cool", "Warm", "Friendly", "Authoritative"].map((tone) => (
                            <button
                              key={tone}
                              onClick={() => handleToneToggle(tone)}
                              className={`px-4 py-2 rounded-full border transition-all duration-300 text-xs font-bold ${
                                formData.selectedTones.includes(tone)
                                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                  : "bg-transparent text-white border-white/20 hover:border-white/40"
                              }`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Concept Category */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Concept</h3>
                        <div className="flex flex-wrap gap-2">
                          {["Tech-driven", "Human-centric", "Eco-friendly", "Artistic", "Futuristic"].map((tone) => (
                            <button
                              key={tone}
                              onClick={() => handleToneToggle(tone)}
                              className={`px-4 py-2 rounded-full border transition-all duration-300 text-xs font-bold ${
                                formData.selectedTones.includes(tone)
                                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                  : "bg-transparent text-white border-white/20 hover:border-white/40"
                              }`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={nextStep}
                      className="w-full py-4 bg-white/10 border border-white/20 backdrop-blur-md rounded-full text-white font-semibold transition-all hover:bg-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      Next
                    </button>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                      <h2 className="text-white text-xs font-mono tracking-widest uppercase font-bold drop-shadow-sm">Section 03</h2>
                      <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Additional Preferences</h1>
                      <p className="text-white/60 text-sm">Describe styles, colors, or vibes you want to absolutely avoid.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white uppercase tracking-widest font-bold drop-shadow-sm">Negative Preference</label>
                        <textarea
                          name="negativePreference"
                          value={formData.negativePreference}
                          onChange={handleInputChange}
                          placeholder="e.g., No neon colors, avoid aggressive typography, don't use dark backgrounds..."
                          rows={6}
                          className="w-full bg-black/20 border border-white/40 backdrop-blur-sm rounded-xl px-4 py-4 text-white placeholder:text-white/60 placeholder:font-medium focus:outline-none focus:border-white/60 focus:ring-1 focus:ring-white/20 transition-all resize-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleGenerate}
                      className="w-full py-4 bg-white/10 text-white border border-white/20 backdrop-blur-md rounded-full font-bold transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      Generate Brand Identity
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white text-sm font-medium shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
