import React from "react";
import { Compass, Heart } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card/60 text-muted-foreground mt-auto">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Compass className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-foreground">CareerPilot AI</span>
            </div>
            <p className="text-sm max-w-sm leading-relaxed text-muted-foreground">
              Algorithmic resume targeting, keyword coverage analysis, and high-velocity job application pipeline tracking for tech professionals.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors p-1"
                aria-label="GitHub"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors p-1"
                aria-label="Twitter / X"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors p-1"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.3a1.64 1.64 0 0 0-1.66 1.65 1.65 1.65 0 0 0 1.66 1.64 1.65 1.65 0 0 0 1.65-1.64A1.64 1.64 0 0 0 7.86 6.3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#resume-engine" className="hover:text-foreground transition-colors">ATS Keyword Scanner</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Application Pipeline</a></li>
              <li><a href="#resume-engine" className="hover:text-foreground transition-colors">AI Resume Tailoring</a></li>
              <li><a href="#resume-engine" className="hover:text-foreground transition-colors">Resume Versions & PDF</a></li>
            </ul>
          </div>

          {/* Column 2: Architecture & Workflow */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Workflow</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">4-Step Job Search Loop</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Open Beta Access</a></li>
              <li><span className="text-muted-foreground/80">Spring Boot 3.4 & React 19</span></li>
              <li><span className="text-muted-foreground/80">Gemini 3.8 Flash Engine</span></li>
            </ul>
          </div>

          {/* Column 3: Trust & Privacy */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Trust & Privacy</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-muted-foreground/90">Explicit AI Consent Required</span></li>
              <li><span className="text-muted-foreground/90">Zero Data Selling Policy</span></li>
              <li><span className="text-muted-foreground/90">Isolated User Schemas</span></li>
              <li><span className="text-muted-foreground/90">Self-Hostable Core</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
          <p>© {CURRENT_YEAR} CareerPilot AI. All rights reserved.</p>
          <p className="flex items-center gap-1 text-muted-foreground">
            Built with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> for ambitious tech job seekers.
          </p>
        </div>
      </div>
    </footer>
  );
};
