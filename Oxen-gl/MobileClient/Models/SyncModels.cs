using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace OxenGL.Mobile.Models;

public class SyncQueueEventDto
{
    [JsonPropertyName("operation_id")]
    public string OperationId { get; set; } = string.Empty;

    [JsonPropertyName("entity_type")]
    public string EntityType { get; set; } = string.Empty;

    [JsonPropertyName("action")]
    public string Action { get; set; } = "create";

    [JsonPropertyName("payload")]
    public object Payload { get; set; } = new();

    [JsonPropertyName("client_timestamp")]
    public DateTime? ClientTimestamp { get; set; }
}

public class SyncBatchRequestDto
{
    [JsonPropertyName("device_token")]
    public string DeviceToken { get; set; } = string.Empty;

    [JsonPropertyName("events")]
    public List<SyncQueueEventDto> Events { get; set; } = new();
}

public class SyncBatchItemResultDto
{
    [JsonPropertyName("operation_id")]
    public string OperationId { get; set; } = string.Empty;

    [JsonPropertyName("entity_type")]
    public string EntityType { get; set; } = string.Empty;

    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty; // "APPLIED", "REJECTED_CONFLICT", "SKIPPED_DUPLICATE", "FAILED"

    [JsonPropertyName("is_conflict")]
    public bool IsConflict { get; set; }

    [JsonPropertyName("conflict_reason")]
    public string? ConflictReason { get; set; }

    [JsonPropertyName("server_record_id")]
    public string? ServerRecordId { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

public class SyncBatchResponseDto
{
    [JsonPropertyName("processed_count")]
    public int ProcessedCount { get; set; }

    [JsonPropertyName("applied_count")]
    public int AppliedCount { get; set; }

    [JsonPropertyName("conflict_count")]
    public int ConflictCount { get; set; }

    [JsonPropertyName("duplicate_count")]
    public int DuplicateCount { get; set; }

    [JsonPropertyName("failed_count")]
    public int FailedCount { get; set; }

    [JsonPropertyName("results")]
    public List<SyncBatchItemResultDto> Results { get; set; } = new();
}
