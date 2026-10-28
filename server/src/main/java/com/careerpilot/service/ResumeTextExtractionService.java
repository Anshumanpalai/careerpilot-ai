package com.careerpilot.service;

import com.careerpilot.exception.BadRequestException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.regex.Pattern;

@Service
public class ResumeTextExtractionService {

    private static final Logger log = LoggerFactory.getLogger(ResumeTextExtractionService.class);

    public static final int MAX_PAGES = 20;
    public static final int MAX_TEXT_LENGTH = 100_000;

    // Heading detection patterns (heuristics)
    private static final Pattern SKILLS_HEADING = Pattern.compile(
            "^(?:technical\\s+)?skills(?:\\s*(&|and|\\/)\\s*(?:technologies|tools|competencies))?$|^core\\s+competencies$|^tech(?:nical)?\\s+stack$|^technologies$|^tools\\s*(&|and|\\/)\\s*technologies$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EXPERIENCE_HEADING = Pattern.compile(
            "^(?:work|professional|employment|career)?\\s*experience$|^work\\s+history$|^employment\\s+history$|^career\\s+history$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EDUCATION_HEADING = Pattern.compile(
            "^education(?:\\s*(&|and|\\/)\\s*(?:training|certifications|credentials))?$|^academic\\s+(?:background|history)$|^degrees(?:\\s*(&|and)\\s*certifications)?$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PROJECTS_HEADING = Pattern.compile(
            "^(?:key|technical|personal|selected|academic)?\\s*projects$|^project\\s+experience$",
            Pattern.CASE_INSENSITIVE
    );

    public ExtractedResumeData extractAndParse(Resource fileResource, String originalFilename) {
        if (fileResource == null || !fileResource.exists()) {
            throw new BadRequestException("Resume document file not found in storage.");
        }

        String extension = getExtension(originalFilename);
        String rawText;

        if (".pdf".equalsIgnoreCase(extension)) {
            rawText = extractTextFromPdf(fileResource);
        } else if (".docx".equalsIgnoreCase(extension)) {
            rawText = extractTextFromDocx(fileResource);
        } else {
            throw new BadRequestException("Unsupported document format: " + extension + ". Only PDF and DOCX documents can be parsed.");
        }

        if (rawText == null || rawText.trim().isEmpty()) {
            throw new BadRequestException("The document contains no readable text. Scanned image-only PDFs or empty files cannot be parsed.");
        }

        if (rawText.length() > MAX_TEXT_LENGTH) {
            rawText = rawText.substring(0, MAX_TEXT_LENGTH);
        }

        return parseSections(rawText);
    }

    private String extractTextFromPdf(Resource resource) {
        try {
            File file;
            try {
                file = resource.getFile();
            } catch (IOException e) {
                // If not resolvable as File directly, load via byte array or input stream
                try (InputStream is = resource.getInputStream()) {
                    byte[] bytes = is.readAllBytes();
                    try (PDDocument document = Loader.loadPDF(bytes)) {
                        return doExtractPdf(document);
                    }
                }
            }

            try (PDDocument document = Loader.loadPDF(file)) {
                return doExtractPdf(document);
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("PDF text extraction failed: {}", e.getMessage());
            throw new BadRequestException("Failed to read PDF document: File may be damaged, encrypted, or malformed.");
        }
    }

    private String doExtractPdf(PDDocument document) throws IOException {
        if (document.isEncrypted()) {
            throw new BadRequestException("Password-protected or encrypted PDF documents cannot be processed.");
        }

        if (document.getNumberOfPages() > MAX_PAGES) {
            throw new BadRequestException("PDF document exceeds the maximum limit of " + MAX_PAGES + " pages.");
        }

        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);
        return stripper.getText(document);
    }

    private String extractTextFromDocx(Resource resource) {
        try (InputStream is = resource.getInputStream();
             XWPFDocument doc = new XWPFDocument(is);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        } catch (Exception e) {
            log.error("DOCX text extraction failed: {}", e.getMessage());
            throw new BadRequestException("Failed to read DOCX document: File may be damaged or malformed.");
        }
    }

    public ExtractedResumeData parseSections(String rawText) {
        String[] lines = rawText.split("\\r?\\n");

        StringBuilder skillsBuilder = new StringBuilder();
        StringBuilder experienceBuilder = new StringBuilder();
        StringBuilder educationBuilder = new StringBuilder();
        StringBuilder projectsBuilder = new StringBuilder();

        Section currentSection = Section.NONE;

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            // Clean heading candidates of bullet symbols and punctuation
            String cleanCandidate = trimmed.replaceAll("^[•\\-\\*>#]+\\s*", "")
                    .replaceAll("[:\\s]+$", "")
                    .trim();

            if (cleanCandidate.length() <= 45) {
                if (SKILLS_HEADING.matcher(cleanCandidate).matches()) {
                    currentSection = Section.SKILLS;
                    continue;
                } else if (EXPERIENCE_HEADING.matcher(cleanCandidate).matches()) {
                    currentSection = Section.EXPERIENCE;
                    continue;
                } else if (EDUCATION_HEADING.matcher(cleanCandidate).matches()) {
                    currentSection = Section.EDUCATION;
                    continue;
                } else if (PROJECTS_HEADING.matcher(cleanCandidate).matches()) {
                    currentSection = Section.PROJECTS;
                    continue;
                }
            }

            // Append content to current active section
            switch (currentSection) {
                case SKILLS -> skillsBuilder.append(trimmed).append("\n");
                case EXPERIENCE -> experienceBuilder.append(trimmed).append("\n");
                case EDUCATION -> educationBuilder.append(trimmed).append("\n");
                case PROJECTS -> projectsBuilder.append(trimmed).append("\n");
                default -> {
                    // Lines before any identified section (e.g. contact header or summary)
                }
            }
        }

        String skills = skillsBuilder.length() > 0 ? skillsBuilder.toString().trim() : null;
        String experience = experienceBuilder.length() > 0 ? experienceBuilder.toString().trim() : null;
        String education = educationBuilder.length() > 0 ? educationBuilder.toString().trim() : null;
        String projects = projectsBuilder.length() > 0 ? projectsBuilder.toString().trim() : null;

        return new ExtractedResumeData(
                rawText.trim(),
                skills,
                experience,
                education,
                projects
        );
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot != -1 ? filename.substring(dot).toLowerCase() : "";
    }

    private enum Section {
        NONE,
        SKILLS,
        EXPERIENCE,
        EDUCATION,
        PROJECTS
    }

    public record ExtractedResumeData(
            String rawText,
            String skillsSummary,
            String experienceSummary,
            String educationSummary,
            String projectsSummary
    ) {}
}
