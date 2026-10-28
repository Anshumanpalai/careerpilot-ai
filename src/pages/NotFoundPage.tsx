import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, Home, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 mb-6 shadow-sm">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">404</h1>
      <h2 className="text-xl font-semibold text-foreground mt-2">Opportunity Route Not Found</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
        The career link or page you are looking for has moved or does not exist. Let's get you back on course.
      </p>
      <div className="flex items-center gap-3 mt-8">
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="brand" size="sm" className="gap-2">
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
