package com.raincatcher.backend.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiWaterAdvisorService service;

    public AiController(AiWaterAdvisorService service) {
        this.service = service;
    }

    @GetMapping("/water-advisor")
    public ResponseEntity<AiAdvisorResponse> waterAdvisor() {
        return ResponseEntity.ok(service.waterAdvisor());
    }

    @PostMapping("/water-advisor/actions")
    public ResponseEntity<AiAdvisorActionEntity> recordAction(@RequestBody(required = false) AiAdvisorActionRequest request) {
        return ResponseEntity.ok(service.recordAction(request));
    }

    @GetMapping("/report-summary")
    public ResponseEntity<AiReportSummaryResponse> reportSummary() {
        return ResponseEntity.ok(service.reportSummary());
    }
}
