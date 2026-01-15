"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";

interface CarouselSlide {
  id: string;
  imageUrl: string;
  alt: string;
  title?: string;
  subtitle?: string;
}

interface HeroCarouselProps {
  slides: CarouselSlide[];
  autoplayInterval?: number;
  className?: string;
}

export function HeroCarousel({
  slides,
  autoplayInterval = 5000,
  className,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance slides
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [isPaused, slides.length, autoplayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden bg-muted/30",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div className="relative h-full w-full">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentSlide.id}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0"
            exit={{ opacity: 0, scale: 1.05 }}
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            <div className="relative h-full w-full">
              <Image
                alt={currentSlide.alt}
                className="object-cover"
                fill
                priority={currentIndex === 0}
                quality={90}
                sizes="100vw"
                src={currentSlide.imageUrl}
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

              {/* Slide content */}
              {(currentSlide.title || currentSlide.subtitle) && (
                <div className="absolute inset-0 flex items-end justify-center pb-16">
                  <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                    {currentSlide.title && (
                      <motion.h2
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl"
                        initial={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.2 }}
                      >
                        {currentSlide.title}
                      </motion.h2>
                    )}
                    {currentSlide.subtitle && (
                      <motion.p
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-lg text-white/90 drop-shadow-lg sm:text-xl"
                        initial={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.3 }}
                      >
                        {currentSlide.subtitle}
                      </motion.p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <Button
            className={cn(
              "absolute left-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full",
              "bg-background/80 backdrop-blur-sm transition-all hover:bg-background/90",
              "opacity-0 group-hover:opacity-100"
            )}
            onClick={goToPrevious}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            className={cn(
              "absolute right-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full",
              "bg-background/80 backdrop-blur-sm transition-all hover:bg-background/90",
              "opacity-0 group-hover:opacity-100"
            )}
            onClick={goToNext}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dots Navigation */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              )}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
