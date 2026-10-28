package com.careerpilot.repository;

import com.careerpilot.entity.ResumeImprovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResumeImprovementRepository extends JpaRepository<ResumeImprovement, UUID> {

    Optional<ResumeImprovement> findFirstByResumeIdAndUserIdOrderByCreatedAtDesc(UUID resumeId, UUID userId);

    List<ResumeImprovement> findByResumeIdAndUserIdOrderByCreatedAtDesc(UUID resumeId, UUID userId);

    void deleteByResumeId(UUID resumeId);
}
