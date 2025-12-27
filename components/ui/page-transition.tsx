"use client";

import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerChildren({
  children,
  className = "",
  staggerDelay = 100
}: StaggerChildrenProps) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{
                animationDelay: `${index * staggerDelay}ms`,
                animationFillMode: "backwards"
              }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className = "" }: FadeInProps) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "backwards"
      }}
    >
      {children}
    </div>
  );
}

export function SlideUp({ children, delay = 0, className = "" }: FadeInProps) {
  return (
    <div
      className={`animate-slide-up ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "backwards"
      }}
    >
      {children}
    </div>
  );
}

export type { PageTransitionProps, StaggerChildrenProps, FadeInProps };
