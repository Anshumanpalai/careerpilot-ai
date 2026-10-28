package com.careerpilot.repository;

import com.careerpilot.entity.ApplicationStatus;
import com.careerpilot.entity.JobApplication;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {

    Optional<JobApplication> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);

    @Query("""
        SELECT a FROM JobApplication a
        WHERE a.user.id = :userId
          AND (:status IS NULL OR a.status = :status)
          AND (
            :query IS NULL OR :query = '' OR
            LOWER(a.companyName) LIKE LOWER(CONCAT('%', :query, '%')) OR
            LOWER(a.jobTitle) LIKE LOWER(CONCAT('%', :query, '%')) OR
            (a.location IS NOT NULL AND LOWER(a.location) LIKE LOWER(CONCAT('%', :query, '%')))
          )
    """)
    List<JobApplication> searchApplications(
            @Param("userId") UUID userId,
            @Param("status") ApplicationStatus status,
            @Param("query") String query,
            Sort sort
    );

    long countByUserId(UUID userId);

    long countByUserIdAndStatus(UUID userId, ApplicationStatus status);

    long countByUserIdAndAppliedDateGreaterThanEqual(UUID userId, LocalDate date);

    @Query("SELECT AVG(a.matchScore) FROM JobApplication a WHERE a.user.id = :userId AND a.matchScore IS NOT NULL")
    Double getAverageMatchScoreByUserId(@Param("userId") UUID userId);
}
