package com.raincatcher.backend.admin.reporttemplate;

public record AdminReportTemplateRequest(
        String name,
        String description,
        String sectionsJson,
        Boolean enabled
) {
}
