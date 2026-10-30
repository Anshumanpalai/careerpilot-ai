package com.careerpilot.repository;

import com.careerpilot.entity.ResumeVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResumeVersionRepository extends JpaRepository<ResumeVersion, UUID> {

    List<ResumeVersion> findByResumeIdAndUserIdOrderByVersionNumberDesc(UUID resumeId, UUID userId);

    List<ResumeVersion> findByResumeIdAndUserIdOrderByVersionNumberAsc(UUID resumeId, UUID userId);

    Optional<ResumeVersion> findByIdAndUserId(UUID id, UUID userId);

    Optional<ResumeVersion> findByIdAndResumeIdAndUserId(UUID id, UUID resumeId, UUID userId);

    Optional<ResumeVersion> findTopByResumeIdAndUserIdOrderByVersionNumberDesc(UUID resumeId, UUID userId);

    boolean existsByResumeIdAndUserIdAndVersionNameIgnoreCase(UUID resumeId, UUID userId, String versionName);

    long countByResumeIdAndUserId(UUID resumeId, UUID userId);

    @Query("SELECT COALESCE(MAX(rv.versionNumber), 0) FROM ResumeVersion rv WHERE rv.resume.id = :resumeId AND rv.user.id = :userId")
    int findMaxVersionNumberByResumeIdAndUserId(@Param("resumeId") UUID resumeId, @Param("userId") UUID userId);
}

