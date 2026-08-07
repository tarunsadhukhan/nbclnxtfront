"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Box, Typography, Avatar, IconButton, CircularProgress } from "@mui/material";
import { Camera, Trash2 } from "lucide-react";
import { tokens } from "@/styles/tokens";

interface EmployeePhotoUploadProps {
  photoUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => void;
  disabled: boolean;
  employeeName?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE_MB = 5;

export default function EmployeePhotoUpload({
  photoUrl,
  onUpload,
  onDelete,
  disabled,
  employeeName,
}: EmployeePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync preview with external photoUrl
  useEffect(() => {
    setPreview(photoUrl);
  }, [photoUrl]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPEG and PNG images are allowed");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File size exceeds ${MAX_SIZE_MB} MB limit`);
        return;
      }

      // Show local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        await onUpload(file);
      } catch {
        setError("Failed to upload photo");
        setPreview(photoUrl);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onUpload, photoUrl],
  );

  const handleDelete = useCallback(() => {
    setPreview(null);
    setError(null);
    onDelete?.();
  }, [onDelete]);

  const initials = employeeName
    ? employeeName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : "?";

  return (
    <Box className="flex flex-col items-center gap-2 mb-4">
      <Box className="relative">
        <Avatar
          src={preview ?? undefined}
          alt={employeeName ?? "Employee"}
          sx={{
            width: 100,
            height: 100,
            fontSize: 32,
            bgcolor: tokens.brand.primary,
          }}
        >
          {!preview && initials}
        </Avatar>

        {uploading && (
          <Box
            className="absolute inset-0 flex items-center justify-center rounded-full"
            sx={{ bgcolor: "rgba(0,0,0,0.4)" }}
          >
            <CircularProgress size={28} sx={{ color: "white" }} />
          </Box>
        )}

        {!disabled && (
          <Box className="absolute -bottom-1 -right-1 flex gap-0.5">
            <IconButton
              size="small"
              aria-label="Upload photo"
              onClick={() => inputRef.current?.click()}
              sx={{
                bgcolor: tokens.brand.primary,
                color: "white",
                width: 28,
                height: 28,
                "&:hover": { bgcolor: tokens.brand.primaryHover },
              }}
            >
              <Camera size={14} />
            </IconButton>
            {preview && onDelete && (
              <IconButton
                size="small"
                aria-label="Remove photo"
                onClick={handleDelete}
                sx={{
                  bgcolor: "#ef4444",
                  color: "white",
                  width: 28,
                  height: 28,
                  "&:hover": { bgcolor: "#dc2626" },
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            )}
          </Box>
        )}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {!disabled && !preview && (
        <Typography variant="caption" color="textSecondary">
          Upload Photo (JPEG/PNG, max 5 MB)
        </Typography>
      )}

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
