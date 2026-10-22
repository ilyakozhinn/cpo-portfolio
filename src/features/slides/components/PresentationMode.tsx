"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, StickyNote, Maximize2 } from "lucide-react";
import { useSlidesStore } from "../store";
import { SlideRenderer, SLIDE_WIDTH, SLIDE_HEIGHT } from "./SlideRenderer";
import { cn } from "@/lib/utils";

interface PresentationModeProps {
  onExit: () => void;
}

export function PresentationMode({ onExit }: PresentationModeProps) {
  const { presentation } = useSlidesStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const totalSlides = presentation?.slides.length ?? 0;
  const currentSlide = presentation?.slides[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, totalSlides]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "Enter":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "Backspace":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onExit();
          }
          break;
        case "n":
        case "N":
          setShowNotes(!showNotes);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "Home":
          setCurrentIndex(0);
          break;
        case "End":
          setCurrentIndex(totalSlides - 1);
          break;
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [goNext, goPrev, onExit, showNotes, toggleFullscreen, totalSlides]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goPrev();
        } else {
          goNext();
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goNext, goPrev]);

  if (!presentation || !currentSlide) return null;

  const scale = Math.min(
    (dimensions.width - 48) / SLIDE_WIDTH,
    (dimensions.height - (showNotes ? 200 : 100)) / SLIDE_HEIGHT,
    1
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={(e) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX < rect.width / 3) {
          goPrev();
        } else if (clickX > (rect.width * 2) / 3) {
          goNext();
        }
      }}
    >
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="transition-transform duration-300 ease-out"
          style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
        >
          <SlideRenderer
            slide={currentSlide}
            theme={presentation.theme}
            scale={1}
            className="shadow-2xl"
          />
        </div>
      </div>

      {showNotes && currentSlide.notes && (
        <div className="h-40 bg-slate-900 border-t border-slate-700 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h4 className="text-sm font-medium text-slate-400 mb-2">Заметки докладчика</h4>
            <p className="text-white whitespace-pre-wrap">{currentSlide.notes}</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-white/80 text-sm font-medium min-w-[80px] text-center backdrop-blur-sm bg-white/10 px-3 py-1.5 rounded-full">
          {currentIndex + 1} / {totalSlides}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={currentIndex === totalSlides - 1}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
          className={cn(
            "p-2 rounded-full text-white hover:bg-white/20 backdrop-blur-sm",
            showNotes ? "bg-white/30" : "bg-white/10"
          )}
          title="Заметки (N)"
        >
          <StickyNote size={20} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
          title="Полный экран (F)"
        >
          <Maximize2 size={20} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
          title="Выход (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-white/50 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>
    </div>
  );
}
