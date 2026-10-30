package com.careerpilot.service;

import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.ResumeVersion;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ResumePdfExportServiceTest {

    private final ResumePdfExportService service = new ResumePdfExportService();

    @Test
    @DisplayName("PDF Export service generates valid ATS-friendly PDF")
    void testPdfGeneration() throws Exception {
        User user = new User(
                "john.doe@example.com",
                "hash",
                "John Doe",
                UserRole.JOB_SEEKER,
                "Senior Software Engineer"
        );
        user.setId(UUID.randomUUID());

        Resume resume = new Resume(
                user,
                "John_Doe.pdf",
                "storage-key-1",
                "application/pdf",
                1000L,
                ResumeStatus.PARSED
        );
        resume.setId(UUID.randomUUID());

        ResumeVersion version = new ResumeVersion(
                resume,
                user,
                1,
                "v1 - Main Draft",
                "Staff Software Engineer",
                "Google",
                "Seasoned software engineer with 8 years building distributed systems and microservices.",
                "Java 21, Spring Boot 3.4, PostgreSQL, Kubernetes, Docker, AWS",
                "• Designed distributed caching layer that improved response times by 65%\n• Led cross-functional team of 6 engineers migrating legacy monolith to Spring Boot",
                "B.S. in Computer Science, State University (2016)",
                "• CareerPilot AI: High-performance job application copilot",
                "AWS Certified Solutions Architect",
                true,
                null
        );
        version.setId(UUID.randomUUID());

        byte[] pdfBytes = service.generateResumePdf(version, user);
        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(doc);
            assertThat(text).contains("John Doe");
            assertThat(text).contains("Staff Software Engineer");
            assertThat(text).contains("PROFESSIONAL SUMMARY");
            assertThat(text).contains("TECHNICAL & PROFESSIONAL SKILLS");
            assertThat(text).contains("WORK EXPERIENCE");
            assertThat(text).contains("EDUCATION");
        }
    }
}

