package com.jobwatch.apiservice.repositories;

import com.jobwatch.apiservice.models.Job;
import com.jobwatch.apiservice.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {
    Optional<Job> findByExternalId(String externalId);
    boolean existsByExternalId(String externalId);

    @Query("SELECT j.externalId FROM Job j WHERE j.company.slug = :companySlug")
    List<String> findExternalIdsByCompanySlug(@Param("companySlug") String companySlug);

    @Modifying
    @Transactional
    @Query("DELETE FROM Job j WHERE j.company.slug = :companySlug AND j.externalId NOT IN :liveIds")
    void deleteStaleByCompanySlug(@Param("companySlug") String companySlug, @Param("liveIds") Collection<String> liveIds);

    @Query("SELECT j FROM Job j WHERE j.company IN " +
           "(SELECT w.company FROM Watchlist w WHERE w.user = :user) " +
           "ORDER BY j.updatedAt DESC")
    List<Job> findJobsForWatchlist(@Param("user") User user);

    @Query("SELECT j FROM Job j WHERE j.company IN " +
           "(SELECT w.company FROM Watchlist w WHERE w.user = :user) " +
           "AND (:#{#categories == null || #categories.isEmpty()} = true OR j.category IN :categories) " +
           "AND (:#{#seniorities == null || #seniorities.isEmpty()} = true OR j.seniority IN :seniorities) " +
           "AND (:usOnly = false OR (j.location IS NULL OR " +
               "(LOWER(j.location) LIKE '%united states%' OR LOWER(j.location) LIKE '%usa%' OR " +
               "LOWER(j.location) LIKE '%alabama%' OR LOWER(j.location) LIKE '%alaska%' OR LOWER(j.location) LIKE '%arizona%' OR LOWER(j.location) LIKE '%arkansas%' OR " +
               "LOWER(j.location) LIKE '%california%' OR LOWER(j.location) LIKE '%colorado%' OR LOWER(j.location) LIKE '%connecticut%' OR LOWER(j.location) LIKE '%delaware%' OR " +
               "LOWER(j.location) LIKE '%florida%' OR LOWER(j.location) LIKE '%georgia%' OR LOWER(j.location) LIKE '%hawaii%' OR LOWER(j.location) LIKE '%idaho%' OR " +
               "LOWER(j.location) LIKE '%illinois%' OR LOWER(j.location) LIKE '%indiana%' OR LOWER(j.location) LIKE '%iowa%' OR LOWER(j.location) LIKE '%kansas%' OR " +
               "LOWER(j.location) LIKE '%kentucky%' OR LOWER(j.location) LIKE '%louisiana%' OR LOWER(j.location) LIKE '%maine%' OR LOWER(j.location) LIKE '%maryland%' OR " +
               "LOWER(j.location) LIKE '%massachusetts%' OR LOWER(j.location) LIKE '%michigan%' OR LOWER(j.location) LIKE '%minnesota%' OR LOWER(j.location) LIKE '%mississippi%' OR " +
               "LOWER(j.location) LIKE '%missouri%' OR LOWER(j.location) LIKE '%montana%' OR LOWER(j.location) LIKE '%nebraska%' OR LOWER(j.location) LIKE '%nevada%' OR " +
               "LOWER(j.location) LIKE '%new hampshire%' OR LOWER(j.location) LIKE '%new jersey%' OR LOWER(j.location) LIKE '%new mexico%' OR LOWER(j.location) LIKE '%new york%' OR " +
               "LOWER(j.location) LIKE '%north carolina%' OR LOWER(j.location) LIKE '%north dakota%' OR LOWER(j.location) LIKE '%ohio%' OR LOWER(j.location) LIKE '%oklahoma%' OR " +
               "LOWER(j.location) LIKE '%oregon%' OR LOWER(j.location) LIKE '%pennsylvania%' OR LOWER(j.location) LIKE '%rhode island%' OR LOWER(j.location) LIKE '%south carolina%' OR " +
               "LOWER(j.location) LIKE '%south dakota%' OR LOWER(j.location) LIKE '%tennessee%' OR LOWER(j.location) LIKE '%texas%' OR LOWER(j.location) LIKE '%utah%' OR " +
               "LOWER(j.location) LIKE '%vermont%' OR LOWER(j.location) LIKE '%virginia%' OR LOWER(j.location) LIKE '%washington%' OR LOWER(j.location) LIKE '%west virginia%' OR " +
               "LOWER(j.location) LIKE '%wisconsin%' OR LOWER(j.location) LIKE '%wyoming%' OR LOWER(j.location) LIKE '%district of columbia%' OR LOWER(j.location) LIKE '%remote%'))) " +
           "ORDER BY j.updatedAt DESC")
    List<Job> findJobsForWatchlistFiltered(@Param("user") User user,
                                           @Param("categories") Collection<String> categories,
                                           @Param("seniorities") Collection<String> seniorities,
                                           @Param("usOnly") boolean usOnly);
}
