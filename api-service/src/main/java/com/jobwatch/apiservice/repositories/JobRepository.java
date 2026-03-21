package com.jobwatch.apiservice.repositories;

import com.jobwatch.apiservice.models.Job;
import com.jobwatch.apiservice.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {
    Optional<Job> findByExternalId(String externalId);
    boolean existsByExternalId(String externalId);

    @Query("SELECT j FROM Job j WHERE j.company IN " +
           "(SELECT w.company FROM Watchlist w WHERE w.user = :user) " +
           "ORDER BY j.updatedAt DESC")
    List<Job> findJobsForWatchlist(@Param("user") User user);

    @Query("SELECT j FROM Job j WHERE j.company IN " +
           "(SELECT w.company FROM Watchlist w WHERE w.user = :user) " +
           "AND (:category IS NULL OR j.category = :category) " +
           "AND (:seniority IS NULL OR j.seniority = :seniority) " +
           "AND (:usOnly = false OR (j.location IS NULL OR " +
               "LOWER(j.location) LIKE '%united states%' OR " +
               "LOWER(j.location) LIKE '%usa%' OR " +
               "LOWER(j.location) LIKE '%, ca%' OR " +
               "LOWER(j.location) LIKE '%, ny%' OR " +
               "LOWER(j.location) LIKE '%, wa%' OR " +
               "LOWER(j.location) LIKE '%, tx%' OR " +
               "LOWER(j.location) LIKE '%, ma%' OR " +
               "LOWER(j.location) LIKE '%, co%' OR " +
               "LOWER(j.location) LIKE '%, il%' OR " +
               "LOWER(j.location) LIKE '%remote%' OR " +
               "LOWER(j.location) LIKE '%san francisco%' OR " +
               "LOWER(j.location) LIKE '%new york%' OR " +
               "LOWER(j.location) LIKE '%seattle%' OR " +
               "LOWER(j.location) LIKE '%austin%' OR " +
               "LOWER(j.location) LIKE '%chicago%' OR " +
               "LOWER(j.location) LIKE '%boston%')) " +
           "ORDER BY j.updatedAt DESC")
    List<Job> findJobsForWatchlistFiltered(@Param("user") User user,
                                           @Param("category") String category,
                                           @Param("seniority") String seniority,
                                           @Param("usOnly") boolean usOnly);
}
