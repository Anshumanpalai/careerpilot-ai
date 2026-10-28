package com.careerpilot.controller;

import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.UserRepository;
import com.careerpilot.security.JwtTokenProvider;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.FileSystemUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ResumeParsingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Value("${app.storage.resumes-dir:./target/test-storage/resumes}")
    private String testStorageDir;

    private User userA;
    private User userB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        resumeRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User(
                "parsinguserA@example.com",
                passwordEncoder.encode("Password123!"),
                "User Parsing Alpha",
                UserRole.JOB_SEEKER,
                "Staff Backend Engineer"
        ));

        userB = userRepository.save(new User(
                "parsinguserB@example.com",
                passwordEncoder.encode("Password123!"),
                "User Parsing Beta",
                UserRole.JOB_SEEKER,
                "Data Scientist"
        ));

        tokenA = jwtTokenProvider.generateToken(userA);
        tokenB = jwtTokenProvider.generateToken(userB);
    }

    @AfterEach
    void tearDown() {
        try {
            Path storagePath = Paths.get(testStorageDir);
            if (Files.exists(storagePath)) {
                FileSystemUtils.deleteRecursively(storagePath);
            }
        } catch (Exception ignored) {
        }
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
                for (String line : text.split("\n")) {
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
    @DisplayName("POST /api/v1/resumes/{id}/parse should extract text and sections from PDF")
    void shouldParsePdfResumeSuccessfully() throws Exception {
        String pdfContent = "Alice Johnson\n" +
                "TECHNICAL SKILLS\n" +
                "Java 21, Spring Boot, Docker, PostgreSQL\n" +
                "WORK EXPERIENCE\n" +
                "Senior Engineer at Enterprise Cloud\n" +
                "EDUCATION\n" +
                "BS Computer Engineering, UC Berkeley\n" +
                "PROJECTS\n" +
                "Distributed Job Matching Copilot";

        byte[] pdfBytes = createTextPdf(pdfContent);
        MockMultipartFile file = new MockMultipartFile("file", "Alice_Resume.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isCreated());

        Resume uploaded = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);
        assertThat(uploaded.getStatus()).isEqualTo(ResumeStatus.UPLOADED);

        // Parse resume
        mockMvc.perform(post("/api/v1/resumes/" + uploaded.getId() + "/parse")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(uploaded.getId().toString()))
                .andExpect(jsonPath("$.status").value("PARSED"))
                .andExpect(jsonPath("$.rawText").isNotEmpty())
                .andExpect(jsonPath("$.sections.skills").value("Java 21, Spring Boot, Docker, PostgreSQL"))
                .andExpect(jsonPath("$.sections.experience").value("Senior Engineer at Enterprise Cloud"))
                .andExpect(jsonPath("$.sections.education").value("BS Computer Engineering, UC Berkeley"))
                .andExpect(jsonPath("$.sections.projects").value("Distributed Job Matching Copilot"))
                .andExpect(jsonPath("$.parsedAt").isNotEmpty());

        Resume updated = resumeRepository.findById(uploaded.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(ResumeStatus.PARSED);
        assertThat(updated.getRawText()).contains("Alice Johnson");

        // Verify original file remains intact and downloadable
        MvcResult downloadRes = mockMvc.perform(get("/api/v1/resumes/" + uploaded.getId() + "/download")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(downloadRes.getResponse().getContentAsByteArray()).isEqualTo(pdfBytes);
    }

    @Test
    @DisplayName("POST /api/v1/resumes/{id}/parse should extract text from DOCX")
    void shouldParseDocxResumeSuccessfully() throws Exception {
        String[] docxContent = new String[]{
                "Bob Williams",
                "CORE COMPETENCIES",
                "Python, FastAPI, Redis, AWS",
                "PROFESSIONAL EXPERIENCE",
                "Backend Lead at AI Solutions",
                "EDUCATION",
                "MS Computer Science, CMU",
                "PROJECTS",
                "High throughput data pipeline"
        };

        byte[] docxBytes = createTextDocx(docxContent);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "Bob_Resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isCreated());

        Resume uploaded = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(post("/api/v1/resumes/" + uploaded.getId() + "/parse")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARSED"))
                .andExpect(jsonPath("$.sections.skills").value("Python, FastAPI, Redis, AWS"))
                .andExpect(jsonPath("$.sections.experience").value("Backend Lead at AI Solutions"));
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id}/analysis should return analysis results for owner")
    void shouldGetResumeAnalysisSuccessfully() throws Exception {
        byte[] pdfBytes = createTextPdf("Dev Resume\nSKILLS\nReact, TypeScript\nEXPERIENCE\nDeveloper at StartUp");
        MockMultipartFile file = new MockMultipartFile("file", "dev.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/v1/resumes").file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        // Parse first
        mockMvc.perform(post("/api/v1/resumes/" + resume.getId() + "/parse").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());

        // Retrieve analysis
        mockMvc.perform(get("/api/v1/resumes/" + resume.getId() + "/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(resume.getId().toString()))
                .andExpect(jsonPath("$.status").value("PARSED"))
                .andExpect(jsonPath("$.sections.skills").value("React, TypeScript"));
    }

    @Test
    @DisplayName("Re-parsing should successfully update already parsed resume")
    void shouldSupportReparsingResume() throws Exception {
        byte[] pdfBytes = createTextPdf("John\nSKILLS\nJava\nEXPERIENCE\nEngineer");
        MockMultipartFile file = new MockMultipartFile("file", "john.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/v1/resumes").file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        // First parse
        mockMvc.perform(post("/api/v1/resumes/" + resume.getId() + "/parse").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());

        // Re-parse
        mockMvc.perform(post("/api/v1/resumes/" + resume.getId() + "/parse").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARSED"));
    }

    @Test
    @DisplayName("Parsing empty textless PDF should set status to FAILED")
    void shouldHandleEmptyTextlessPdfFailure() throws Exception {
        byte[] emptyPdf = createEmptyPdf();
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", emptyPdf);

        mockMvc.perform(multipart("/api/v1/resumes").file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(post("/api/v1/resumes/" + resume.getId() + "/parse")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The document contains no readable text. Scanned image-only PDFs or empty files cannot be parsed."));

        Resume failed = resumeRepository.findById(resume.getId()).orElseThrow();
        assertThat(failed.getStatus()).isEqualTo(ResumeStatus.FAILED);
        assertThat(failed.getParsingError()).contains("no readable text");
    }

    @Test
    @DisplayName("Cross-user parse access should be denied (returns 404)")
    void shouldDenyCrossUserParse() throws Exception {
        byte[] pdfBytes = createTextPdf("Secret\nSKILLS\nRust");
        MockMultipartFile file = new MockMultipartFile("file", "secret.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/v1/resumes").file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        // User B tries to parse User A's resume
        mockMvc.perform(post("/api/v1/resumes/" + resume.getId() + "/parse")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Cross-user analysis access should be denied (returns 404)")
    void shouldDenyCrossUserAnalysis() throws Exception {
        byte[] pdfBytes = createTextPdf("Confidential\nSKILLS\nGo");
        MockMultipartFile file = new MockMultipartFile("file", "conf.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/v1/resumes").file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));
        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(get("/api/v1/resumes/" + resume.getId() + "/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Unauthenticated parse and analysis requests should return 401")
    void shouldRejectUnauthenticatedRequests() throws Exception {
        mockMvc.perform(post("/api/v1/resumes/00000000-0000-0000-0000-000000000000/parse"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/resumes/00000000-0000-0000-0000-000000000000/analysis"))
                .andExpect(status().isUnauthorized());
    }
}
