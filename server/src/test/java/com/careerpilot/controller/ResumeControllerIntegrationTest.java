package com.careerpilot.controller;

import com.careerpilot.entity.Resume;
import com.careerpilot.entity.ResumeStatus;
import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import com.careerpilot.repository.ResumeRepository;
import com.careerpilot.repository.UserRepository;
import com.careerpilot.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.FileSystemUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ResumeControllerIntegrationTest {

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

    // Helper byte arrays for testing valid document signatures
    private static final byte[] VALID_PDF_BYTES = new byte[]{
            0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37, 0x0A, 0x25, (byte) 0xE2, (byte) 0xE3, (byte) 0xCF, (byte) 0xD3
    };

    private static final byte[] VALID_DOCX_BYTES = new byte[]{
            0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00, 0x00, 0x00, 0x21, 0x00
    };

    @BeforeEach
    void setUp() {
        resumeRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new User(
                "resumetesta@example.com",
                passwordEncoder.encode("Password123!"),
                "User Resumes Alpha",
                UserRole.JOB_SEEKER,
                "Software Engineer"
        ));

        userB = userRepository.save(new User(
                "resumetestb@example.com",
                passwordEncoder.encode("Password123!"),
                "User Resumes Beta",
                UserRole.JOB_SEEKER,
                "Product Manager"
        ));

        tokenA = jwtTokenProvider.generateToken(userA);
        tokenB = jwtTokenProvider.generateToken(userB);
    }

    @AfterEach
    void tearDown() {
        // Clean up test storage directory
        try {
            Path storagePath = Paths.get(testStorageDir);
            if (Files.exists(storagePath)) {
                FileSystemUtils.deleteRecursively(storagePath);
            }
        } catch (Exception ignored) {
        }
    }

    @Test
    @DisplayName("POST /api/v1/resumes should upload valid PDF resume and save metadata")
    void shouldUploadValidPdfResume() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "Senior_Engineer_Resume.pdf",
                "application/pdf",
                VALID_PDF_BYTES
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.originalFilename").value("Senior_Engineer_Resume.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.fileSize").value(VALID_PDF_BYTES.length))
                .andExpect(jsonPath("$.status").value("UPLOADED"))
                .andExpect(jsonPath("$.storageKey").doesNotExist()) // Never expose internal storage key
                .andReturn();

        assertThat(resumeRepository.countByUserId(userA.getId())).isEqualTo(1);
        assertThat(resumeRepository.countByUserId(userB.getId())).isEqualTo(0);
    }

    @Test
    @DisplayName("POST /api/v1/resumes should upload valid DOCX resume")
    void shouldUploadValidDocxResume() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "Resume_2026.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                VALID_DOCX_BYTES
        );

        mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalFilename").value("Resume_2026.docx"))
                .andExpect(jsonPath("$.contentType").value("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));

        assertThat(resumeRepository.countByUserId(userA.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("POST /api/v1/resumes should reject empty file")
    void shouldRejectEmptyFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot upload an empty file."));
    }

    @Test
    @DisplayName("POST /api/v1/resumes should reject unsupported extension (e.g. .txt)")
    void shouldRejectUnsupportedFileType() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.txt",
                "text/plain",
                "Just some plain text resume".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported file type. Only PDF and DOCX files are allowed."));
    }

    @Test
    @DisplayName("POST /api/v1/resumes should reject malformed file signature")
    void shouldRejectMalformedPdfSignature() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "fake.pdf",
                "application/pdf",
                "This is not a real PDF file header".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/resumes")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid PDF file: file signature does not match PDF format."));
    }

    @Test
    @DisplayName("GET /api/v1/resumes should list only current user's resumes")
    void shouldListOnlyCurrentUserResumes() throws Exception {
        // Upload 2 resumes for User A
        MockMultipartFile fileA1 = new MockMultipartFile("file", "A1.pdf", "application/pdf", VALID_PDF_BYTES);
        MockMultipartFile fileA2 = new MockMultipartFile("file", "A2.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA1).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA2).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        // Upload 1 resume for User B
        MockMultipartFile fileB = new MockMultipartFile("file", "B1.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileB).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB));

        // User A list
        mockMvc.perform(get("/api/v1/resumes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // User B list
        mockMvc.perform(get("/api/v1/resumes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].originalFilename").value("B1.pdf"));
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id} should deny cross-user access (returns 404)")
    void shouldDenyCrossUserAccessOnMetadata() throws Exception {
        MockMultipartFile fileA = new MockMultipartFile("file", "Secret_Resume.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resumeA = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        // User B tries to view User A's resume
        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Resume not found with id: '" + resumeA.getId() + "'"));
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id}/download should allow owner to download resume")
    void shouldDownloadResumeSuccessfully() throws Exception {
        MockMultipartFile fileA = new MockMultipartFile("file", "Download_Me.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resumeA = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        MvcResult downloadResult = mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/download")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"))
                .andExpect(header().exists(HttpHeaders.CONTENT_DISPOSITION))
                .andReturn();

        byte[] downloadedBytes = downloadResult.getResponse().getContentAsByteArray();
        assertThat(downloadedBytes).isEqualTo(VALID_PDF_BYTES);
    }

    @Test
    @DisplayName("GET /api/v1/resumes/{id}/download should deny cross-user download (returns 404)")
    void shouldDenyCrossUserDownload() throws Exception {
        MockMultipartFile fileA = new MockMultipartFile("file", "Protected.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resumeA = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(get("/api/v1/resumes/" + resumeA.getId() + "/download")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/v1/resumes/{id} should delete resume database record and file")
    void shouldDeleteResumeSuccessfully() throws Exception {
        MockMultipartFile fileA = new MockMultipartFile("file", "Delete_Target.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resumeA = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(delete("/api/v1/resumes/" + resumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isNoContent());

        assertThat(resumeRepository.findById(resumeA.getId())).isEmpty();
    }

    @Test
    @DisplayName("DELETE /api/v1/resumes/{id} should deny cross-user deletion (returns 404)")
    void shouldDenyCrossUserDeletion() throws Exception {
        MockMultipartFile fileA = new MockMultipartFile("file", "Keep_Me.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(fileA).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resumeA = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(delete("/api/v1/resumes/" + resumeA.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        assertThat(resumeRepository.findById(resumeA.getId())).isPresent();
    }

    @Test
    @DisplayName("Unauthenticated request to /api/v1/resumes should return 401")
    void shouldRejectUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/v1/resumes"))
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ //
    //  RENAME TESTS                                                        //
    // ------------------------------------------------------------------ //

    @Test
    @DisplayName("PATCH /api/v1/resumes/{id}/rename should update the filename and return 200")
    void shouldRenameResume() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "old_name.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(file)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(patch("/api/v1/resumes/" + resume.getId() + "/rename")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"filename\":\"my_updated_resume.pdf\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("my_updated_resume.pdf"));

        Resume updated = resumeRepository.findById(resume.getId()).orElseThrow();
        assertThat(updated.getOriginalFilename()).isEqualTo("my_updated_resume.pdf");
    }

    @Test
    @DisplayName("PATCH /api/v1/resumes/{id}/rename should return 400 for blank filename")
    void shouldRejectBlankFilenameOnRename() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(file)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(patch("/api/v1/resumes/" + resume.getId() + "/rename")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"filename\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/v1/resumes/{id}/rename should deny cross-user access (returns 404)")
    void shouldDenyCrossUserRename() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", VALID_PDF_BYTES);
        mockMvc.perform(multipart("/api/v1/resumes").file(file)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA));

        Resume resume = resumeRepository.findByUserIdOrderByCreatedAtDesc(userA.getId()).get(0);

        mockMvc.perform(patch("/api/v1/resumes/" + resume.getId() + "/rename")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"filename\":\"attacker_rename.pdf\"}"))
                .andExpect(status().isNotFound());

        // Verify the original filename is unchanged
        assertThat(resumeRepository.findById(resume.getId()).orElseThrow().getOriginalFilename())
                .isEqualTo("resume.pdf");
    }
}
