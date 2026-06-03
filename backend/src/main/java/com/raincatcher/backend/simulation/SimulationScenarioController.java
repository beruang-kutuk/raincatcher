package com.raincatcher.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulation")
public class SimulationScenarioController {

    private final SimulationScenarioService service;

    public SimulationScenarioController(SimulationScenarioService service) {
        this.service = service;
    }

    @GetMapping("/scenarios")
    public ResponseEntity<List<SimulationScenarioEntity>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping("/scenarios")
    public ResponseEntity<SimulationScenarioEntity> save(@RequestBody(required = false) JsonNode body) {
        if (body == null || body.isNull()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(service.save(body));
    }

    @DeleteMapping("/scenarios/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted", "id", id));
    }
}
