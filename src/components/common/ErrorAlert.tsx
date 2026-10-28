import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-destructive ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-destructive">{title}</h4>
          <p className="text-xs text-destructive/80 mt-1 leading-relaxed">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
