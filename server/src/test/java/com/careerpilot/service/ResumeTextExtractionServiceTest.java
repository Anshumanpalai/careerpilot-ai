package com.careerpilot.service;

import com.careerpilot.exception.BadRequestException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumeTextExtractionServiceTest {

    private ResumeTextExtractionService extractionService;

    @BeforeEach
    void setUp() {
        extractionService = new ResumeTextExtractionService();
    }

    private byte[] createTextPdf(String text) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);

                String[] lines = text.split("\n");
                for (String line : lines) {
                    stream.showText(line);
                    stream.newLineAtOffset(0, -15);
                }
                stream.endText();
            }
            doc.save(baos);
        }
        return baos.toByteArray();
    }

    private byte[] createEmptyPdf() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            doc.save(baos);
        }
        return baos.toByteArray();
    }

    private byte[] createTextDocx(String[] paragraphs) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (XWPFDocument doc = new XWPFDocument()) {
            for (String p : paragraphs) {
                XWPFParagraph paragraph = doc.createParagraph();
                paragraph.createRun().setText(p);
            }
            doc.write(baos);
        }
        return baos.toByteArray();
    }

    @Test
    @DisplayName("Should extract text and detect sections from valid text-based PDF")
    void shouldExtractTextAndSectionsFromPdf() throws IOException {
        String pdfContent = "Jane Doe\n" +
                "TECHNICAL SKILLS\n" +
                "Java, Spring Boot, PostgreSQL, Docker\n" +
                "PROFESSIONAL EXPERIENCE\n" +
                "Staff Software Engineer at Acme Corp\n" +
                "EDUCATION\n" +
                "BS in Computer Science, Stanford\n" +
                "PROJECTS\n" +
                "CareerPilot AI Platform";

        byte[] pdfBytes = createTextPdf(pdfContent);
        ByteArrayResource resource = new ByteArrayResource(pdfBytes);

        ResumeTextExtractionService.ExtractedResumeData result =
                extractionService.extractAndParse(resource, "resume.pdf");

        assertThat(result.rawText()).contains("Jane Doe");
        assertThat(result.skillsSummary()).contains("Java, Spring Boot, PostgreSQL, Docker");
        assertThat(result.experienceSummary()).contains("Staff Software Engineer at Acme Corp");
        assertThat(result.educationSummary()).contains("BS in Computer Science, Stanford");
        assertThat(result.projectsSummary()).contains("CareerPilot AI Platform");
    }

    @Test
    @DisplayName("Should extract text and detect sections from valid DOCX")
    void shouldExtractTextAndSectionsFromDocx() throws IOException {
        String[] docxContent = new String[]{
                "John Smith",
                "CORE COMPETENCIES",
                "React, TypeScript, Next.js, Node.js",
                "WORK EXPERIENCE",
                "Frontend Lead at Web Innovations",
                "ACADEMIC BACKGROUND",
                "Master of Science, MIT",
                "KEY PROJECTS",
                "High-performance design system"
        };

        byte[] docxBytes = createTextDocx(docxContent);
        ByteArrayResource resource = new ByteArrayResource(docxBytes);

        ResumeTextExtractionService.ExtractedResumeData result =
                extractionService.extractAndParse(resource, "resume.docx");

        assertThat(result.rawText()).contains("John Smith");
        assertThat(result.skillsSummary()).contains("React, TypeScript, Next.js, Node.js");
        assertThat(result.experienceSummary()).contains("Frontend Lead at Web Innovations");
        assertThat(result.educationSummary()).contains("Master of Science, MIT");
        assertThat(result.projectsSummary()).contains("High-performance design system");
    }

    @Test
    @DisplayName("Should reject empty textless PDF document")
    void shouldRejectEmptyTextlessPdf() throws IOException {
        byte[] emptyPdf = createEmptyPdf();
        ByteArrayResource resource = new ByteArrayResource(emptyPdf);

        assertThatThrownBy(() -> extractionService.extractAndParse(resource, "empty.pdf"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("contains no readable text");
    }

    @Test
    @DisplayName("Should reject malformed PDF file")
    void shouldRejectMalformedPdf() {
        ByteArrayResource resource = new ByteArrayResource("Corrupt non-pdf payload".getBytes());

        assertThatThrownBy(() -> extractionService.extractAndParse(resource, "broken.pdf"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Failed to read PDF document");
    }

    @Test
    @DisplayName("Should reject unsupported document format")
    void shouldRejectUnsupportedFormat() {
        ByteArrayResource resource = new ByteArrayResource("Some text".getBytes());

        assertThatThrownBy(() -> extractionService.extractAndParse(resource, "doc.txt"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Unsupported document format");
    }
}
