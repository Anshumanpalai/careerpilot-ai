package com.careerpilot.repository;

import com.careerpilot.entity.User;
import com.careerpilot.entity.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Should persist user and find by case-insensitive email")
    void shouldPersistAndFindByEmail() {
        User user = new User(
                "dev.candidate@careerpilot.io",
                "hashedPassword123",
                "Dev Candidate",
                UserRole.JOB_SEEKER,
                "Staff Software Engineer"
        );
        entityManager.persistAndFlush(user);

        Optional<User> found = userRepository.findByEmailIgnoreCase("DEV.CANDIDATE@CAREERPILOT.IO");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isNotNull();
        assertThat(found.get().getFullName()).isEqualTo("Dev Candidate");
        assertThat(found.get().getRole()).isEqualTo(UserRole.JOB_SEEKER);
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("existsByEmailIgnoreCase should return true for existing email")
    void shouldReturnTrueWhenEmailExists() {
        User user = new User(
                "sarah.lead@careerpilot.io",
                "hashedPassword456",
                "Sarah Lead",
                UserRole.CAREER_COACH,
                "Engineering Manager"
        );
        entityManager.persistAndFlush(user);

        boolean exists = userRepository.existsByEmailIgnoreCase("sarah.lead@careerpilot.io");
        boolean notExists = userRepository.existsByEmailIgnoreCase("unknown@careerpilot.io");

        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }
}
