package com.careerpilot.service;

import com.careerpilot.entity.ResumeVersion;
import com.careerpilot.entity.User;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to generate professional, ATS-friendly resumes in PDF format.
 * Utilizes standard Type 1 fonts (Helvetica) and structured semantic sections
 * to ensure maximum parseability by Automated Tracking Systems (ATS).
 */
@Service
public class ResumePdfExportService {

    private static final Logger log = LoggerFactory.getLogger(ResumePdfExportService.class);

    private static final float MARGIN_LEFT = 50f;
    private static final float MARGIN_RIGHT = 50f;
    private static final float MARGIN_TOP = 50f;
    private static final float MARGIN_BOTTOM = 50f;
    private static final float PAGE_WIDTH = PDRectangle.LETTER.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.LETTER.getHeight();
    private static final float CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    public byte[] generateResumePdf(ResumeVersion version, User user) {
        try (PDDocument document = new PDDocument()) {
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontOblique = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            PdfContext ctx = new PdfContext(document, fontRegular, fontBold, fontOblique);
            ctx.startNewPage();

            // 1. Header (User full name / target role / email / version metadata)
            renderHeader(ctx, version, user);

            // 2. Professional Summary
            if (hasContent(version.getSummary())) {
                renderSection(ctx, "PROFESSIONAL SUMMARY", version.getSummary(), false);
            }

            // 3. Technical & Professional Skills
            if (hasContent(version.getSkills())) {
                renderSection(ctx, "TECHNICAL & PROFESSIONAL SKILLS", version.getSkills(), false);
            }

            // 4. Professional Experience
            if (hasContent(version.getExperience())) {
                renderSection(ctx, "WORK EXPERIENCE", version.getExperience(), true);
            }

            // 5. Projects
            if (hasContent(version.getProjects())) {
                renderSection(ctx, "KEY PROJECTS", version.getProjects(), true);
            }

            // 6. Education
            if (hasContent(version.getEducation())) {
                renderSection(ctx, "EDUCATION", version.getEducation(), false);
            }

            // 7. Additional / Custom Sections
            if (hasContent(version.getCustomSections())) {
                renderSection(ctx, "ADDITIONAL INFORMATION", version.getCustomSections(), false);
            }

            ctx.closeCurrentStream();

            // Render page footers on all pages
            renderFooters(document, fontRegular);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            log.error("Failed to generate ATS PDF for version id={}: {}", version.getId(), e.getMessage());
            throw new RuntimeException("Failed to generate resume PDF: " + e.getMessage(), e);
        }
    }

    private void renderHeader(PdfContext ctx, ResumeVersion version, User user) throws IOException {
        String fullName = (user != null && user.getFullName() != null && !user.getFullName().isBlank())
                ? user.getFullName()
                : "Candidate Resume";

        String targetRole = version.getTargetRole();
        String targetCompany = version.getTargetCompany();

        StringBuilder subtitle = new StringBuilder();
        if (targetRole != null && !targetRole.isBlank()) {
            subtitle.append(targetRole.trim());
        }
        if (targetCompany != null && !targetCompany.isBlank()) {
            if (subtitle.length() > 0) subtitle.append(" | Target: ");
            subtitle.append(targetCompany.trim());
        }

        StringBuilder contactLine = new StringBuilder();
        if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
            contactLine.append(user.getEmail());
        }
        contactLine.append(" | Version: ").append(version.getVersionName());

        // Name
        ctx.stream.beginText();
        ctx.stream.setFont(ctx.fontBold, 18);
        ctx.stream.newLineAtOffset(MARGIN_LEFT, ctx.currentY);
        ctx.stream.showText(sanitizeText(fullName));
        ctx.stream.endText();
        ctx.currentY -= 20;

        // Subtitle (Target Role)
        if (subtitle.length() > 0) {
            ctx.stream.beginText();
            ctx.stream.setFont(ctx.fontBold, 11);
            ctx.stream.newLineAtOffset(MARGIN_LEFT, ctx.currentY);
            ctx.stream.showText(sanitizeText(subtitle.toString()));
            ctx.stream.endText();
            ctx.currentY -= 15;
        }

        // Contact / Version line
        ctx.stream.beginText();
        ctx.stream.setFont(ctx.fontRegular, 9);
        ctx.stream.newLineAtOffset(MARGIN_LEFT, ctx.currentY);
        ctx.stream.showText(sanitizeText(contactLine.toString()));
        ctx.stream.endText();
        ctx.currentY -= 12;

        // Divider rule
        drawHorizontalLine(ctx.stream, MARGIN_LEFT, ctx.currentY, PAGE_WIDTH - MARGIN_RIGHT, 0.75f);
        ctx.currentY -= 18;
    }

    private void renderSection(PdfContext ctx, String sectionTitle, String content, boolean parseBullets) throws IOException {
        checkPageSpace(ctx, 45);

        // Section Title
        ctx.stream.beginText();
        ctx.stream.setFont(ctx.fontBold, 11);
        ctx.stream.newLineAtOffset(MARGIN_LEFT, ctx.currentY);
        ctx.stream.showText(sanitizeText(sectionTitle));
        ctx.stream.endText();
        ctx.currentY -= 4;

        // Subtle section divider
        drawHorizontalLine(ctx.stream, MARGIN_LEFT, ctx.currentY, PAGE_WIDTH - MARGIN_RIGHT, 0.5f);
        ctx.currentY -= 12;

        // Section body
        String[] lines = content.split("\r?\n");
        for (String rawLine : lines) {
            String trimmed = rawLine.trim();
            if (trimmed.isEmpty()) {
                ctx.currentY -= 6;
                continue;
            }

            boolean isBullet = parseBullets && (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*"));
            String textToWrap = isBullet ? trimmed.replaceFirst("^[•\\-*]\\s*", "") : trimmed;
            float indent = isBullet ? 14f : 0f;
            float availableWidth = CONTENT_WIDTH - indent;

            List<String> wrappedLines = wrapText(textToWrap, ctx.fontRegular, 9.5f, availableWidth);
            for (int i = 0; i < wrappedLines.size(); i++) {
                checkPageSpace(ctx, 14);

                String line = wrappedLines.get(i);
                ctx.stream.beginText();
                ctx.stream.setFont(ctx.fontRegular, 9.5f);

                if (i == 0 && isBullet) {
                    ctx.stream.newLineAtOffset(MARGIN_LEFT, ctx.currentY);
                    ctx.stream.showText("- ");
                    ctx.stream.newLineAtOffset(indent, 0);
                    ctx.stream.showText(sanitizeText(line));
                } else {
                    ctx.stream.newLineAtOffset(MARGIN_LEFT + indent, ctx.currentY);
                    ctx.stream.showText(sanitizeText(line));
                }
                ctx.stream.endText();
                ctx.currentY -= 13f;
            }
        }

        ctx.currentY -= 10f;
    }

    private void checkPageSpace(PdfContext ctx, float requiredHeight) throws IOException {
        if (ctx.currentY - requiredHeight < MARGIN_BOTTOM) {
            ctx.closeCurrentStream();
            ctx.startNewPage();
        }
    }

    private void drawHorizontalLine(PDPageContentStream stream, float startX, float y, float endX, float width) throws IOException {
        stream.setLineWidth(width);
        stream.moveTo(startX, y);
        stream.lineTo(endX, y);
        stream.stroke();
    }

    private List<String> wrapText(String text, PDFont font, float fontSize, float maxWidth) throws IOException {
        List<String> result = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return result;
        }

        String[] words = text.split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String candidate = currentLine.length() == 0 ? word : currentLine + " " + word;
            float stringWidth = font.getStringWidth(sanitizeText(candidate)) / 1000f * fontSize;
            if (stringWidth <= maxWidth) {
                currentLine = new StringBuilder(candidate);
            } else {
                if (currentLine.length() > 0) {
                    result.add(currentLine.toString());
                    currentLine = new StringBuilder(word);
                } else {
                    // Single word exceeds width, force break
                    result.add(word);
                    currentLine = new StringBuilder();
                }
            }
        }
        if (currentLine.length() > 0) {
            result.add(currentLine.toString());
        }
        return result;
    }

    private void renderFooters(PDDocument document, PDFont font) throws IOException {
        int pageCount = document.getNumberOfPages();
        for (int i = 0; i < pageCount; i++) {
            PDPage page = document.getPage(i);
            try (PDPageContentStream footerStream = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                String footerText = String.format("CareerPilot AI  |  Page %d of %d  |  ATS-Optimized Export", i + 1, pageCount);
                float stringWidth = font.getStringWidth(footerText) / 1000f * 8f;
                float x = (PAGE_WIDTH - stringWidth) / 2f;

                footerStream.beginText();
                footerStream.setFont(font, 8f);
                footerStream.newLineAtOffset(x, 25f);
                footerStream.showText(footerText);
                footerStream.endText();
            }
        }
    }

    /**
     * Replaces non-printable or unsupported characters to avoid Type 1 font encoding errors.
     */
    public static String sanitizeText(String input) {
        if (input == null) return "";
        return input
                .replace("\u2018", "'")
                .replace("\u2019", "'")
                .replace("\u201C", "\"")
                .replace("\u201D", "\"")
                .replace("\u2022", "-")
                .replace("\u2013", "-")
                .replace("\u2014", "--")
                .replace("\u00A0", " ")
                .replaceAll("[^\\x00-\\x7F]", " ");
    }

    private boolean hasContent(String str) {
        return str != null && !str.trim().isEmpty();
    }

    private static class PdfContext {
        final PDDocument document;
        final PDType1Font fontRegular;
        final PDType1Font fontBold;
        final PDType1Font fontOblique;
        PDPageContentStream stream;
        float currentY;

        PdfContext(PDDocument document, PDType1Font fontRegular, PDType1Font fontBold, PDType1Font fontOblique) {
            this.document = document;
            this.fontRegular = fontRegular;
            this.fontBold = fontBold;
            this.fontOblique = fontOblique;
        }

        void startNewPage() throws IOException {
            PDPage page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);
            this.stream = new PDPageContentStream(document, page);
            this.currentY = PAGE_HEIGHT - MARGIN_TOP;
        }

        void closeCurrentStream() throws IOException {
            if (this.stream != null) {
                this.stream.close();
                this.stream = null;
            }
        }
    }
}

