package com.raincatcher.backend.admin.device;

public record AdminDeviceRequest(
        String name,
        String category,
        String status,
        String lastSeen,
        String lastData,
        String inputTag,
        Boolean maintenanceMode,
        String notes
) {
}
