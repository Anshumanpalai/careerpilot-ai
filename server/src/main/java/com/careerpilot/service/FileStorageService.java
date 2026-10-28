package com.careerpilot.service;

import com.careerpilot.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    private static final byte[] PDF_MAGIC_BYTES = new byte[]{0x25, 0x50, 0x44, 0x46}; // "%PDF"
    private static final byte[] ZIP_MAGIC_BYTES = new byte[]{0x50, 0x4B, 0x03, 0x04}; // "PK\x03\x04" for DOCX

    @Value("${app.storage.resumes-dir:./storage/resumes}")
    private String resumesDir;

    private Path rootStorageLocation;

    @PostConstruct
    public void init() {
        try {
            this.rootStorageLocation = Paths.get(resumesDir).toAbsolutePath().normalize();
            Files.createDirectories(this.rootStorageLocation);
            log.info("Initialized secure resume storage at: {}", this.rootStorageLocation);
        } catch (IOException e) {
            throw new IllegalStateException("Could not initialize local file storage directory: " + resumesDir, e);
        }
    }

    public StorageResult storeResume(UUID userId, MultipartFile file) {
        validateFile(file);

        String originalFilename = cleanFilename(file.getOriginalFilename());
        String extension = getFileExtension(originalFilename);
        String storageKey = UUID.randomUUID().toString() + extension;

        Path userDir = this.rootStorageLocation.resolve(userId.toString()).normalize();
        Path destinationFile = userDir.resolve(storageKey).normalize();

        // Enforce path traversal prevention
        if (!destinationFile.startsWith(userDir)) {
            throw new BadRequestException("Invalid file destination path.");
        }

        try {
            Files.createDirectories(userDir);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            log.error("Failed to store file on disk for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to store file on server.", e);
        }

        String determinedContentType = extension.equalsIgnoreCase(".pdf")
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        return new StorageResult(originalFilename, storageKey, determinedContentType, file.getSize());
    }

    public Resource loadAsResource(UUID userId, String storageKey) {
        Path filePath = resolveFilePath(userId, storageKey);
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new BadRequestException("File does not exist or is not readable.");
            }
        } catch (MalformedURLException e) {
            throw new BadRequestException("Could not read file: " + e.getMessage());
        }
    }

    public void deleteFile(UUID userId, String storageKey) {
        Path filePath = resolveFilePath(userId, storageKey);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Failed to delete physical file {} for user {}: {}", storageKey, userId, e.getMessage());
        }
    }

    private Path resolveFilePath(UUID userId, String storageKey) {
        if (!StringUtils.hasText(storageKey) || storageKey.contains("..") || storageKey.contains("/") || storageKey.contains("\\")) {
            throw new BadRequestException("Invalid storage key identifier.");
        }

        Path userDir = this.rootStorageLocation.resolve(userId.toString()).normalize();
        Path targetPath = userDir.resolve(storageKey).normalize();

        if (!targetPath.startsWith(userDir)) {
            throw new BadRequestException("Access to target file path is denied.");
        }
        return targetPath;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File size exceeds maximum permitted limit of 10MB.");
        }

        String filename = cleanFilename(file.getOriginalFilename());
        String extension = getFileExtension(filename);

        if (!extension.equalsIgnoreCase(".pdf") && !extension.equalsIgnoreCase(".docx")) {
            throw new BadRequestException("Unsupported file type. Only PDF and DOCX files are allowed.");
        }

        // Validate file signature / magic bytes
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[4];
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                throw new BadRequestException("File is corrupted or too small to be a valid document.");
            }

            if (extension.equalsIgnoreCase(".pdf")) {
                if (!Arrays.equals(header, PDF_MAGIC_BYTES)) {
                    throw new BadRequestException("Invalid PDF file: file signature does not match PDF format.");
                }
            } else if (extension.equalsIgnoreCase(".docx")) {
                if (!Arrays.equals(header, ZIP_MAGIC_BYTES)) {
                    throw new BadRequestException("Invalid DOCX file: file signature does not match DOCX format.");
                }
            }
        } catch (IOException e) {
            throw new BadRequestException("Could not inspect uploaded file contents: " + e.getMessage());
        }
    }

    private String cleanFilename(String originalFilename) {
        if (!StringUtils.hasText(originalFilename)) {
            return "resume_document";
        }
        String clean = StringUtils.cleanPath(originalFilename);
        if (clean.contains("..")) {
            throw new BadRequestException("Filename contains invalid path sequence.");
        }
        Path path = Paths.get(clean);
        return path.getFileName().toString();
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex == -1 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex).toLowerCase();
    }

    public record StorageResult(
            String originalFilename,
            String storageKey,
            String contentType,
            long fileSize
    ) {}
}
